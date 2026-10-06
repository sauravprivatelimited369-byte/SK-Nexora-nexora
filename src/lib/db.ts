import 'server-only';
import { readFile } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { Pool as PgPool, QueryResultRow } from 'pg';

type Row = Record<string, unknown>;
type QueryResponse<T> = { rows: T[]; rowCount: number };
type PgliteClient = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number | null }>;
  exec: (sql: string) => Promise<unknown>;
};

type Driver =
  | { kind: 'postgres'; pool: PgPool }
  | { kind: 'pglite'; client: PgliteClient };

const globalForNexora = globalThis as typeof globalThis & {
  nexoraDriver?: Driver;
  nexoraInit?: Promise<void>;
};

async function createDriver(): Promise<Driver> {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (connectionString) {
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX || 5),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: process.env.DATABASE_SSL === 'disable' ? false : { rejectUnauthorized: true },
    });
    return { kind: 'postgres', pool };
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is required in production. Configure a managed PostgreSQL database; embedded PGlite is for local development only.');
  }

  const dataDir = path.join(process.cwd(), '.nexora-data');
  await mkdir(dataDir, { recursive: true });
  const { PGlite } = await import('@electric-sql/pglite');
  const client = new PGlite(dataDir) as unknown as PgliteClient;
  return { kind: 'pglite', client };
}

async function init(): Promise<void> {
  if (!globalForNexora.nexoraInit) {
    globalForNexora.nexoraInit = (async () => {
      const driver = globalForNexora.nexoraDriver ?? await createDriver();
      globalForNexora.nexoraDriver = driver;
      const schema = await readFile(path.join(process.cwd(), 'db/migrations/0001_init.sql'), 'utf8');
      if (driver.kind === 'pglite') {
        await driver.client.exec(schema);
      } else {
        const statements = schema.split(';').map((statement) => statement.trim()).filter(Boolean);
        const client = await driver.pool.connect();
        try {
          await client.query('BEGIN');
          for (const statement of statements) await client.query(statement);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }
      const { seedDatabase } = await import('./seed-data');
      await seedDatabase(queryWithoutInit);
    })().catch((error) => {
      globalForNexora.nexoraInit = undefined;
      throw error;
    });
  }
  await globalForNexora.nexoraInit;
}

async function queryWithoutInit<T extends Row = Row>(sql: string, params: unknown[] = []): Promise<QueryResponse<T>> {
  const driver = globalForNexora.nexoraDriver;
  if (!driver) throw new Error('Database driver has not been initialized');
  if (driver.kind === 'postgres') {
    const result = await driver.pool.query<T & QueryResultRow>(sql, params);
    return { rows: result.rows, rowCount: result.rowCount ?? 0 };
  }
  const result = await driver.client.query(sql, params);
  return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
}

export async function query<T extends Row = Row>(sql: string, params: unknown[] = []): Promise<QueryResponse<T>> {
  await init();
  return queryWithoutInit<T>(sql, params);
}

export async function execute(sql: string, params: unknown[] = []): Promise<number> {
  const result = await query(sql, params);
  return result.rowCount;
}

export async function transaction<T>(callback: (tx: <R extends Row = Row>(sql: string, params?: unknown[]) => Promise<QueryResponse<R>>) => Promise<T>): Promise<T> {
  await init();
  const driver = globalForNexora.nexoraDriver;
  if (!driver) throw new Error('Database driver has not been initialized');
  if (driver.kind === 'postgres') {
    const client = await driver.pool.connect();
    const tx = async <R extends Row = Row>(sql: string, params: unknown[] = []): Promise<QueryResponse<R>> => {
      const result = await client.query<R & QueryResultRow>(sql, params);
      return { rows: result.rows, rowCount: result.rowCount ?? 0 };
    };
    try {
      await client.query('BEGIN');
      const result = await callback(tx);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  await driver.client.exec('BEGIN');
  try {
    const result = await callback((sql, params = []) => queryWithoutInit(sql, params));
    await driver.client.exec('COMMIT');
    return result;
  } catch (error) {
    await driver.client.exec('ROLLBACK');
    throw error;
  }
}

export async function healthCheck(): Promise<{ database: 'ok'; mode: 'postgres' | 'embedded' }> {
  await query('SELECT 1');
  return { database: 'ok', mode: globalForNexora.nexoraDriver?.kind === 'postgres' ? 'postgres' : 'embedded' };
}

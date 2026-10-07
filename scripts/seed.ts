import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { seedDatabase } from '../src/lib/seed-data';

type SeedQuery = <T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<{ rows: T[]; rowCount: number }>;

async function main() {
  const schema = await readFile(path.join(process.cwd(), 'db/migrations/0001_init.sql'), 'utf8');
  const connectionString = process.env.DATABASE_URL?.trim();
  if (connectionString) {
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX || 5),
      connectionTimeoutMillis: 10_000,
      ssl: process.env.DATABASE_SSL === 'disable' ? false : { rejectUnauthorized: true },
    });
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const statement of schema.split(';').map((part) => part.trim()).filter(Boolean)) await client.query(statement);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      const query: SeedQuery = async <T extends Record<string, unknown>>(sql: string, params: unknown[] = []) => {
        const result = await pool.query(sql, params);
        return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
      };
      await seedDatabase(query);
    } finally {
      await pool.end();
    }
  } else {
    await mkdir(path.join(process.cwd(), '.nexora-data'), { recursive: true });
    const { PGlite } = await import('@electric-sql/pglite');
    const database = new PGlite(path.join(process.cwd(), '.nexora-data'));
    try {
      await database.exec(schema);
      const query: SeedQuery = async <T extends Record<string, unknown>>(sql: string, params: unknown[] = []) => {
        const result = await database.query(sql, params);
        return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
      };
      await seedDatabase(query);
    } finally {
      await database.close();
    }
  }
  console.log('NEXORA schema and starter content are ready.');
}

main().catch((error: unknown) => {
  console.error('Unable to initialize NEXORA data:', error);
  process.exitCode = 1;
});

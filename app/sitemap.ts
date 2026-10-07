import type { MetadataRoute } from 'next';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL || 'https://nexora.app').replace(/\/$/, '');
  const publicPortfolios = await query<{ username: string; updated_at: string }>('SELECT username,updated_at FROM portfolios WHERE is_public=TRUE');
  const staticRoutes = ['', '/pricing'].map((path) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: path ? 0.7 : 1 }));
  return [...staticRoutes, ...publicPortfolios.rows.map((portfolio) => ({ url: `${base}/u/${portfolio.username}`, lastModified: new Date(portfolio.updated_at), changeFrequency: 'monthly' as const, priority: 0.5 }))];
}

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL || 'https://nexora.app';
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/dashboard', '/learn', '/practice', '/projects', '/ai-engineer', '/skills', '/settings', '/resume', '/portfolio', '/onboarding', '/login', '/register'] }], sitemap: `${base.replace(/\/$/, '')}/sitemap.xml`, host: base };
}

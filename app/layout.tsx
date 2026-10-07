import type { Metadata, Viewport } from 'next';
import './globals.css';

const siteUrl = process.env.APP_URL || 'https://nexora.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'NEXORA — From Learning to Building', template: '%s · NEXORA' },
  description: 'An AI-powered engineering workspace that turns learning into practical skills, real projects, and career-ready evidence.',
  applicationName: 'NEXORA',
  openGraph: {
    title: 'NEXORA — From Learning to Building',
    description: 'Learn smarter. Build real projects. Make your engineering growth visible.',
    type: 'website',
    siteName: 'NEXORA',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'NEXORA — From Learning to Building' }],
  },
  twitter: { card: 'summary_large_image', title: 'NEXORA — From Learning to Building', description: 'An AI-powered engineering operating system for learning, building, and career growth.' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: '#080d12', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

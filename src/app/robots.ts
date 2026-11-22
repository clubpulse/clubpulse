import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shift.club';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/dashboard/', '/profile/', '/wallet/', '/live/', '/scout/', '/cv/'],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}

import type { MetadataRoute } from 'next';

const BASE = 'https://www.shiftup.club';

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

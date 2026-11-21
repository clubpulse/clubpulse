import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://clubpulse.co';

// Public marketing pages only.
const PATHS = [
  '', '/about', '/our-story', '/pricing', '/contact',
  '/features', '/features/players', '/features/clubs', '/features/scorecard', '/features/finance',
  '/features/ai-coach', '/features/availability', '/features/scores',
  '/privacy', '/terms', '/refunds', '/scratch-card-rules',
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((p) => ({ url: `${BASE}${p}` }));
}

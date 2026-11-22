import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shiftup.club';

// Public marketing pages only.
const PATHS = [
  '', '/about', '/our-story', '/pricing', '/contact',
  '/get-started', '/for-clubs', '/features', '/for-players', '/players/analysis', '/players/community', '/players/wellness', '/players/academy', '/features/clubs', '/features/scorecard', '/features/finance',
  '/features/ai-coach', '/features/availability', '/features/scores',
  '/privacy', '/terms', '/refunds', '/scratch-card-rules',
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((p) => ({ url: `${BASE}${p}` }));
}

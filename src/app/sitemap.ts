import type { MetadataRoute } from 'next';

const BASE = 'https://www.shiftup.club';

// Public marketing pages only.
const PATHS = [
  '', '/about', '/our-story', '/pricing', '/contact',
  '/get-started', '/for-clubs', '/for-players', '/players/analysis', '/players/community', '/players/wellness', '/players/academy',
  '/features/ai-coach', '/features/scores',
  '/privacy', '/terms', '/refunds', '/scratch-card-rules',
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((p) => ({ url: `${BASE}${p}` }));
}

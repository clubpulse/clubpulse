import type { Metadata } from 'next';
import FeaturesShowcase from '@/components/marketing/FeaturesShowcase';

export const metadata: Metadata = {
  title: 'Features for players | ShiftUp',
  description: 'AI coaching, rewards, mindset, learning and match day, all in one app for cricket players.',
};

export default function PlayerFeaturesPage() {
  return <FeaturesShowcase audience="players" />;
}

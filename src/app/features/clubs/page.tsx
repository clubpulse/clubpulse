import type { Metadata } from 'next';
import FeaturesShowcase from '@/components/marketing/FeaturesShowcase';

export const metadata: Metadata = {
  title: 'Features for clubs',
  description: 'Selection, availability, finance, club insight and communication for cricket club committees.',
};

export default function ClubFeaturesPage() {
  return <FeaturesShowcase audience="clubs" />;
}

import type { Metadata } from 'next';
import PillarPage from '@/components/marketing/PillarPage';

export const metadata: Metadata = {
  title: 'Player Analysis',
  description: 'Video analysis, Coach AI, stats and a shareable Cricket CV for cricketers.',
};

export default function AnalysisPage() {
  return (
    <PillarPage
      eyebrow="Player Analysis"
      colour="#FBBF24"
      title="See exactly what to work on."
      lead="Film a shot or a delivery and see what to work on. Your stats and development tracker show how your game changes over a season. This pillar is the furthest along, and it works on the website today."
      cta={{ href: '/auth/sign-up', label: 'Join as a player' }}
      secondary={{ href: '/features/ai-coach', label: 'How Coach AI works' }}
      groups={[
        {
          status: 'live',
          items: [
            { h: 'Video analysis', body: 'Upload a short clip of your batting or bowling and see what to work on, such as head position, elbow height and follow-through.' },
            { h: 'Stats and player report', body: 'Your results across all seasons: runs, wickets, averages and strike rate, plus a plain-English summary of your season so far.' },
            { h: 'Development tracker', body: 'See what is improving and what is not, session by session.' },
            { h: 'Ball tracking', body: 'Line and length from your own practice footage.' },
            { h: 'Cricket CV', body: 'A shareable page of your record and achievements, with a public link you control.' },
          ],
        },
        {
          status: 'soon',
          items: [
            { h: 'Coach AI', body: 'Pose-based feedback from your phone camera. Still in development and not yet biomechanically validated.' },
          ],
        },
      ]}
      note="Pose analysis runs on your phone; ball tracking and written reports are processed on our servers."
    />
  );
}

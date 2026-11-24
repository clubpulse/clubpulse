import type { Metadata } from 'next';
import PillarPage from '@/components/marketing/PillarPage';

export const metadata: Metadata = {
  title: 'Player Analysis | SHIFTUP',
  description: 'Video analysis, Coach AI, stats and a shareable Cricket CV for cricketers.',
};

export default function AnalysisPage() {
  return (
    <PillarPage
      eyebrow="Player Analysis"
      colour="#FBBF24"
      title="See exactly what to work on."
      lead="Film a shot or a delivery, get plain-English feedback, and watch your game develop over a season. This is the most complete pillar, and it works on the website today."
      cta={{ href: '/auth/sign-up', label: 'Join as a player' }}
      secondary={{ href: '/features/ai-coach', label: 'How Coach AI works' }}
      groups={[
        {
          status: 'live',
          items: [
            { h: 'Video analysis', body: 'Upload a short clip of your batting or bowling and see what to work on, such as head position, elbow height and follow-through.' },
            { h: 'Coach AI', body: 'Coach AI is in development and being validated. It is not biomechanically validated.' },
            { h: 'Stats and player report', body: 'Your results and a plain-English summary of your season so far.' },
            { h: 'Development tracker', body: 'See what is improving and what is not, session by session.' },
            { h: 'Ball tracking', body: 'Line and length from your own practice footage.' },
            { h: 'Cricket CV', body: 'A shareable page of your record and achievements, with a public link you control.' },
          ],
        },
      ]}
      note="Pose analysis runs on your phone; ball tracking and written reports are processed on our servers."
    />
  );
}

import type { Metadata } from 'next';
import PillarPage from '@/components/marketing/PillarPage';

export const metadata: Metadata = {
  title: 'Academy | ClubPulse',
  description: 'Two-minute cricket lessons, daily games and a log for your ECB qualifications.',
};

export default function AcademyPage() {
  return (
    <PillarPage
      eyebrow="Academy"
      colour="#2DD4BF"
      title="Learn the game in two minutes at a time."
      lead="Short lessons, a practice plan, certificates and knowledge games, on the website and in the app."
      cta={{ href: '/auth/sign-up', label: 'Join as a player' }}
      groups={[
        {
          status: 'live',
          items: [
            { h: 'Two-minute lessons', body: 'Twenty short lessons across four tracks: skills, the game, fitness and the wider game, each with a three-question check marked for you.' },
            { h: 'Progress and ClubPulse certificates', body: 'See how far you are through each track. Finish a track and you get a ClubPulse Academy certificate and a badge, and finish all four to graduate. They are not ECB qualifications.' },
            { h: 'Practice plan', body: 'A weekly plan built around what you want to work on.' },
            { h: 'Daily games', body: 'Daily Spin, the Cricket Quiz, Middle It and Higher or Lower, with Scores for taking part.' },
            { h: 'Qualifications log', body: 'Record your ECB courses and keep them in one place. It is a log, not an accredited course platform.' },
          ],
        },
        {
          status: 'soon',
          items: [
            { h: 'Courses written by your coach', body: 'Coaches will be able to write short courses for their own club. Not built yet.' },
          ],
        },
      ]}
    />
  );
}

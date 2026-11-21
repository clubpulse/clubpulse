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
      lead="Short lessons, a practice plan and knowledge games. The lessons live in the mobile app today. On the website you get daily games and a log for your qualifications."
      cta={{ href: '/auth/sign-up', label: 'Join as a player' }}
      groups={[
        {
          status: 'live',
          items: [
            { h: 'Daily games', body: 'Daily Spin, the Cricket Quiz, Middle It and Higher or Lower, with Scores for taking part.' },
            { h: 'Qualifications log', body: 'Record your ECB courses and keep them in one place. It is a log, not an accredited course platform.' },
          ],
        },
        {
          status: 'app',
          items: [
            { h: 'Two-minute lessons', body: 'Twenty short lessons across four tracks: skills, the game, fitness and the wider game.' },
            { h: 'Practice plan', body: 'A weekly plan built around what you want to work on.' },
          ],
        },
        {
          status: 'soon',
          items: [
            { h: 'Courses with certificates', body: 'Longer courses, with a ClubPulse certificate when you finish. Not an ECB qualification.' },
          ],
        },
      ]}
    />
  );
}

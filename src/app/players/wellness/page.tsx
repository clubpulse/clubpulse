import type { Metadata } from 'next';
import PillarPage from '@/components/marketing/PillarPage';

export const metadata: Metadata = {
  title: 'Wellness | ClubPulse',
  description: 'Private check-ins, match mood, an injury log and match-day preparation for cricketers.',
};

export default function WellnessPage() {
  return (
    <PillarPage
      eyebrow="Wellness"
      colour="#F472B6"
      title="Arrive ready to play."
      lead="Look after your body and your head. Start with a private weekly check-in on the website, and use the app for mental-skills routines and match-day preparation."
      cta={{ href: '/auth/sign-up', label: 'Join as a player' }}
      groups={[
        {
          status: 'live',
          items: [
            { h: 'Weekly check-in', body: 'A private weekly check-in on how your body and mind are. Coaches only ever see anonymous club averages.' },
            { h: 'Match mood', body: 'Say how you are feeling going into your next fixture.' },
            { h: 'Injury log', body: 'Keep a private record of knocks and niggles over the season.' },
          ],
        },
        {
          status: 'app',
          items: [
            { h: 'Mind Nets', body: 'A six-week programme: breathing, focus, routines, self-talk, imagery and pressure.' },
            { h: 'Breathing and focus', body: 'Short guided sessions with a breathing circle and a timer.' },
            { h: 'Match-day checklists and routines', body: 'The night before, the morning, at the ground and between balls, plus your own pre-ball routine.' },
          ],
        },
        {
          status: 'soon',
          items: [
            { h: 'Readiness and preparation on the website', body: 'A pre-match readiness check-in, a preparation checklist and trends over time.' },
          ],
        },
      ]}
      note="This is general preparation and is not a medical or clinical service."
    />
  );
}

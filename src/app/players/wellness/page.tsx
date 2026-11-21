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
      lead="Look after your body and your head. Check in before a match, follow your trend, learn mental skills and keep a private recovery log, all on the website."
      cta={{ href: '/auth/sign-up', label: 'Join as a player' }}
      groups={[
        {
          status: 'live',
          items: [
            { h: 'Pre-match readiness and trend', body: 'A quick private check on sleep, mood, soreness and stress, and a four-week trend of how you have been.' },
            { h: 'Match-day checklists and your routine', body: 'The night before, the morning, at the ground and between balls, with ticks saved for the day and a routine you build yourself.' },
            { h: 'Mental skills', body: 'Written guides on breathing, focus, self-talk, imagery and pressure, including a six-week programme.' },
            { h: 'Recovery log', body: 'A private note of how your body feels and what you did about it. It does not diagnose or suggest treatment.' },
            { h: 'Weekly check-in, match mood and injury log', body: 'A private weekly check-in (coaches see only anonymous club averages), how you feel going into a fixture, and a record of knocks and niggles.' },
            { h: 'Your choice on sharing', body: 'Private by default. Adult players can choose to share readiness averages with their club’s coaches, never notes, and can stop at any time.' },
            { h: 'Where to get support', body: 'Samaritans, Mind and NHS 111, with advice for under-18s.' },
          ],
        },
        {
          status: 'app',
          items: [
            { h: 'Breathing circle and timer', body: 'Guided breathing with an animated circle and timer in the ClubPulse app. The website has the same exercises as written steps.' },
          ],
        },
      ]}
      note="This is general preparation and is not a medical or clinical service."
    />
  );
}

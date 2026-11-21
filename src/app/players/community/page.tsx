import type { Metadata } from 'next';
import PillarPage from '@/components/marketing/PillarPage';

export const metadata: Metadata = {
  title: 'Community | ClubPulse',
  description: 'The tools your club already uses together, and the cricket network we are building next.',
};

export default function CommunityPage() {
  return (
    <PillarPage
      eyebrow="Community"
      colour="#60A5FA"
      title="Your club today. Cricket's network next."
      lead="Inside your club, Community is live: a noticeboard, a dressing room and the club's shared documents. Beyond it, we are building a network for cricketers, a Bumble, LinkedIn and Nextdoor for the game. That part is not open yet."
      cta={{ href: '/contact', label: 'Join the waitlist' }}
      secondary={{ href: '/auth/sign-up', label: 'Join as a player' }}
      groups={[
        {
          status: 'live',
          items: [
            { h: 'Club noticeboard', body: 'News, reminders and fixture changes your members actually see.' },
            { h: 'Dressing room', body: 'The squad’s space to talk between matches, inside your club.' },
            { h: 'Club bible and documents', body: 'Rules, contacts and key documents in one place.' },
            { h: 'Alumni and leaderboards', body: 'Keep past members connected, and celebrate who is taking part.' },
          ],
        },
        {
          status: 'soon',
          items: [
            { h: 'Feeds for clubs and local cricket', body: 'Posts, photos and news from your club and cricket near you, with safeguarding built in.' },
            { h: 'Find a club or a game nearby', body: 'Nets, pick-up games and clubs looking for players, by distance, league or county.' },
            { h: 'Connections and teammates', body: 'Follow players and clubs, and connect with people you want to play with.' },
            { h: 'Transfer Window and scouting', body: 'Later: a way for players and clubs to find each other.' },
          ],
        },
      ]}
      note="To join the waitlist, send us a message on the contact page and mention Community."
    />
  );
}

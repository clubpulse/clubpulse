import type { Metadata } from 'next';
import PillarPage from '@/components/marketing/PillarPage';

export const metadata: Metadata = {
  title: 'Community | SHIFTUP',
  description: 'The tools your club already uses together, and a cricket network with safeguarding built in, opening soon.',
};

export default function CommunityPage() {
  return (
    <PillarPage
      eyebrow="Community"
      colour="#60A5FA"
      title="Your club today. Cricket's network next."
      lead="Inside your club, Community is live: a noticeboard, a dressing room and the club's shared documents. The wider cricket network is built: profiles, a feed, connections, and nets and games near you, with moderation and rules to keep under-18s safe. We are switching it on once the final safety checks are complete."
      cta={{ href: '/contact', label: 'Ask about early access' }}
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
            { h: 'Feed for your club and local cricket', body: 'Posts and replies, checked before they go live and reportable by anyone. Under-18s and adults are kept apart in messaging.' },
            { h: 'Nets and games near you', body: 'Nets and pick-up games at club grounds and public venues, by distance, league or county. Junior sessions are only for that club’s juniors.' },
            { h: 'Profiles, connections and follows', body: 'Follow clubs and players and connect with people you want to play with. Parents can see their child’s activity.' },
            { h: 'Transfer Window and scouting', body: 'Later: a way for players and clubs to find each other.' },
          ],
        },
      ]}
      note="These parts are built but not yet open to the public. To ask about early access for your club, message us on the contact page and mention Community."
    />
  );
}

import Link from 'next/link';
import { FOR_CLUBS_HREF, FOR_PLAYERS_HREF } from '@/lib/marketing/routes';

/** The two front doors on the homepage: clubs run the week, players get four pillars. */
export default function FrontDoors() {
  return (
    <section id="front-doors" style={{ padding: '80px 24px 24px', background: '#05080f' }} aria-label="Two front doors">
      <style>{`
        .fd-grid { max-width: 1160px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; }
        .fd-card { display: flex; flex-direction: column; gap: 12px; padding: 30px; border-radius: 20px; text-decoration: none; color: #E8EDF5;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); transition: border-color .15s, background .15s; }
        .fd-card:hover { border-color: rgba(96,165,250,0.5); background: rgba(96,165,250,0.06); }
        .fd-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #60A5FA; }
        .fd-title { font-family: 'Bricolage Grotesque', sans-serif; font-size: 28px; font-weight: 800; line-height: 1.1; }
        .fd-list { list-style: none; margin: 4px 0 0; padding: 0; display: grid; gap: 8px; font-size: 14.5px; color: rgba(232,237,245,0.75); line-height: 1.45; }
        .fd-list li::before { content: '●'; color: #60A5FA; margin-right: 8px; font-size: 10px; }
        .fd-cta { margin-top: 8px; font-size: 14px; font-weight: 700; color: #fff; }
      `}</style>
      <div className="fd-grid">
        <Link href={FOR_CLUBS_HREF} className="fd-card">
          <span className="fd-eyebrow">For clubs</span>
          <span className="fd-title">Fixtures, run end to end.</span>
          <ul className="fd-list">
            <li>Availability and picking the XI</li>
            <li>Ball-by-ball scoring and a shareable scorecard</li>
            <li>Finance tracking and safeguarding in the same place</li>
          </ul>
          <span className="fd-cta">See what clubs get →</span>
        </Link>
        <Link href={FOR_PLAYERS_HREF} className="fd-card">
          <span className="fd-eyebrow">For players</span>
          <span className="fd-title">Four pillars to grow with.</span>
          <ul className="fd-list">
            <li>Player Analysis: video, Coach AI, stats and your Cricket CV</li>
            <li>Community, Wellness and Academy</li>
            <li>Scores earned across all of it, never sold</li>
          </ul>
          <span className="fd-cta">See the four pillars →</span>
        </Link>
      </div>
    </section>
  );
}

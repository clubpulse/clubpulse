import Link from 'next/link';

/**
 * "Features" entry for the public site headers, with a dropdown that splits
 * the features into the player side and the club side.
 *
 * The trigger is a normal link to /features, so every page's existing link
 * styles apply to it, and phones and tablets (which have no hover) simply go to
 * the overview page that offers the same two choices. The panel opens on hover
 * or keyboard focus with CSS only.
 */
export const FEATURE_AUDIENCES = [
  { href: '/features/players', title: 'For players', note: 'Technique, rewards, mindset and learning' },
  { href: '/features/clubs', title: 'For clubs', note: 'Admin, finance, selection and insight' },
] as const;

export default function FeaturesMenu({ active = false }: { active?: boolean }) {
  return (
    <div className="fm">
      <style>{`
        .fm { position: relative; display: inline-flex; align-items: center; }
        .fm-panel {
          display: none; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
          padding-top: 10px; z-index: 80; min-width: 280px;
        }
        .fm:hover .fm-panel, .fm:focus-within .fm-panel { display: block; }
        .fm-card {
          background: #0B1220; border: 1px solid rgba(255,255,255,0.1); border-radius: 14px;
          padding: 8px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        .fm .fm-card a {
          display: block; padding: 11px 14px; border-radius: 10px; opacity: 1; background: transparent;
          color: #E8EDF5; text-decoration: none; font-size: 14px; font-weight: 600; line-height: 1.3;
          white-space: normal;
        }
        .fm .fm-card a:hover { background: rgba(96,165,250,0.12); color: #fff; }
        .fm .fm-card a small { display: block; margin-top: 2px; font-size: 12px; font-weight: 400; color: rgba(232,237,245,0.55); }
        .fm .fm-card a.fm-all { margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.07); border-radius: 0 0 10px 10px; color: #60A5FA; font-size: 13px; }
        .fm-caret { margin-left: 5px; font-size: 9px; opacity: 0.7; }
      `}</style>
      <Link href="/features" className={active ? 'active' : undefined} aria-haspopup="true">
        Features<span className="fm-caret" aria-hidden="true">▾</span>
      </Link>
      <div className="fm-panel">
        <div className="fm-card">
          {FEATURE_AUDIENCES.map((a) => (
            <Link key={a.href} href={a.href}>
              {a.title}
              <small>{a.note}</small>
            </Link>
          ))}
          <Link href="/features" className="fm-all">See everything →</Link>
        </div>
      </div>
    </div>
  );
}

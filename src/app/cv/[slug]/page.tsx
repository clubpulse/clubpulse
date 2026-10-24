import type { Metadata } from 'next';
import { getPublicCV } from '@/lib/actions/cricket-cv';
import { CricketCVCard } from '@/components/cv/CricketCVCard';
import { PRIMARY_ROLE_LABELS } from '@/lib/types/cricket-cv';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicCV(slug);

  if (!result.success || !result.data) {
    return {
      title: 'Cricket CV | ClubPulse',
      description: 'View this player\'s cricket profile on ClubPulse.',
    };
  }

  const { profile } = result.data;
  const name = profile.display_name ?? 'Cricket Player';
  const role = profile.primary_role ? PRIMARY_ROLE_LABELS[profile.primary_role] : '';
  const description = profile.personal_statement
    ?? (profile.tagline ?? `${name}${role ? ` · ${role}` : ''} — Cricket CV on ClubPulse`);
  const title = `${name} · Cricket CV | ClubPulse`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      siteName: 'ClubPulse',
      images: [
        {
          url: profile.avatar_url ?? 'https://clubpulse.app/og-default.png',
          width: 1200,
          height: 630,
          alt: `${name}'s Cricket CV`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [profile.avatar_url ?? 'https://clubpulse.app/og-default.png'],
    },
  };
}

export default async function PublicCVPage({ params }: Props) {
  const { slug } = await params;
  const result = await getPublicCV(slug);

  if (!result.success || !result.data) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#030712',
          fontFamily: "'Inter', sans-serif",
          padding: '24px 16px',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏏</div>
          <h1 style={{ color: '#f9fafb', fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>
            CV not found
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 24px' }}>
            This Cricket CV is not public or doesn&apos;t exist. The player may have made it private, or the link may be incorrect.
          </p>
          <a
            href="https://clubpulse.app"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 20px',
              background: '#7f1d1d',
              border: '1px solid #991b1b',
              borderRadius: '8px',
              color: '#fca5a5',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Go to ClubPulse
          </a>
        </div>
      </main>
    );
  }

  const cv = result.data;

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#030712',
        fontFamily: "'Inter', sans-serif",
        padding: '32px 16px 64px',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          maxWidth: '680px',
          margin: '0 auto 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <a
          href="https://clubpulse.app"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: '#9ca3af',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: '20px' }}>🏏</span>
          ClubPulse
        </a>
        <a
          href="https://clubpulse.app/auth/sign-up"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            background: '#7f1d1d',
            border: '1px solid #991b1b',
            borderRadius: '8px',
            color: '#fca5a5',
            textDecoration: 'none',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          Create your Cricket CV →
        </a>
      </div>

      {/* CV card */}
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <CricketCVCard cv={cv} />
      </div>
    </main>
  );
}

import { requireUser } from '@/lib/auth/server';
import { getMyCricketCV, getCVShareUrl } from '@/lib/actions/cricket-cv';
import { CVEditForm } from '@/components/cv/CVEditForm';
import { CricketCVCard } from '@/components/cv/CricketCVCard';
import { Card } from '@/components/ui/Card';
import { CVTabs } from '@/components/cv/CVTabs';

export const metadata = {
  title: 'My Cricket CV | ClubPulse',
  description: 'Your shareable cricket profile — stats, badges, qualifications and career history.',
};

export default async function CricketCVPage() {
  await requireUser();

  const result = await getMyCricketCV();

  if (!result.success) {
    return (
      <Card title="Cricket CV unavailable">
        <p className="text-sm text-neutral-400">
          We couldn&apos;t load your Cricket CV ({result.error}). Please try again.
        </p>
      </Card>
    );
  }

  const cv = result.data;
  const shareUrl = cv.profile.share_slug ? getCVShareUrl(cv.profile.share_slug) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#f9fafb' }}>
            📄 My Cricket CV
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9ca3af' }}>
            Build your shareable cricket profile — share it with new clubs, coaches, or the ECB.
          </p>
        </div>
        {shareUrl && cv.profile.is_public && (
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: '#7f1d1d',
              border: '1px solid #991b1b',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#fca5a5',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            🔗 View public CV
          </a>
        )}
      </div>

      {/* Tabs: Edit / Preview */}
      <CVTabs cv={cv} />
    </div>
  );
}

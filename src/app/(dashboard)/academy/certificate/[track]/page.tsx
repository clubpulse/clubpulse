import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/server';
import { getCertificate } from '@/lib/academy/service';
import { isCertificateKey } from '@/lib/academy/logic';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Academy certificate' };

export default async function CertificatePage({ params }: { params: Promise<{ track: string }> }) {
  const { track } = await params;
  if (!isCertificateKey(track)) notFound();
  const user = await requireUser();
  const cert = await getCertificate(user.id, track);
  if (!cert) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: 16 }}>
        <h1>Not finished yet</h1>
        <p>Pass every lesson to unlock this certificate.</p>
        <p><Link href={track === 'graduate' ? '/academy' : `/academy/tracks/${track}`}>Back to the lessons</Link></p>
      </div>
    );
  }
  const date = new Date(cert.completedOn).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <div style={{ border: '3px double #2DD4BF', borderRadius: 16, padding: '48px 32px', textAlign: 'center', background: 'rgba(45,212,191,0.06)' }}>
        <p style={{ letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0, fontWeight: 700 }}>ShiftUp Academy</p>
        <p style={{ margin: '24px 0 4px' }}>This certifies that</p>
        <h1 style={{ margin: '4px 0', fontSize: 'clamp(28px, 6vw, 44px)' }}>{cert.name}</h1>
        <p style={{ margin: '16px 0 4px' }}>{cert.graduate ? 'has finished all four tracks of the ShiftUp Academy:' : 'has passed every lesson in the ShiftUp Academy track:'}</p>
        <h2 style={{ margin: '4px 0' }}>{cert.title}</h2>
        <p style={{ margin: '24px 0 0' }}>Completed {date}</p>
        <p style={{ margin: '32px 0 0', fontSize: 12, opacity: 0.7 }}>A ShiftUp Academy certificate. It is not an ECB or other accredited qualification.</p>
      </div>
      <p style={{ marginTop: 16, fontSize: 14 }}>You can screenshot or print this page. Qualifications you have gained elsewhere can be logged in <Link href="/qualifications">Qualifications</Link>.</p>
    </div>
  );
}

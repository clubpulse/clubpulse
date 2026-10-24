'use client';

import { useState } from 'react';
import { PackageCard } from '@/components/sponsor/PackageCard';
import type { SponsorshipPackage, JuniorSlot } from '@/lib/types/sponsor';
import { getSponsorshipPackages, getMySponsorships } from '@/lib/actions/sponsor';
import { MySponsorships } from '@/components/sponsor/MySponsorships';
import type { Sponsorship } from '@/lib/types/sponsor';

interface SponsorPackagesClientProps {
  initialPackages: SponsorshipPackage[];
  initialSponsorships: Sponsorship[];
  juniorSlots: JuniorSlot[];
  walletBalance: number;
  clubId: string;
}

export function SponsorPackagesClient({
  initialPackages,
  initialSponsorships,
  juniorSlots,
  walletBalance,
  clubId,
}: SponsorPackagesClientProps) {
  const [packages, setPackages] = useState(initialPackages);
  const [sponsorships, setSponsorships] = useState(initialSponsorships);
  const [balance, setBalance] = useState(walletBalance);

  async function handleSuccess() {
    // Re-fetch packages (slot counts update) and sponsorship list
    const [pkgsResult, spnsResult] = await Promise.all([
      getSponsorshipPackages(clubId),
      getMySponsorships(clubId),
    ]);
    if (pkgsResult.success) setPackages(pkgsResult.data);
    if (spnsResult.success) setSponsorships(spnsResult.data);
    // Update balance optimistically — will be accurate on next page load
  }

  if (packages.length === 0) {
    return (
      <div style={{
        background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '14px', padding: '28px 20px', textAlign: 'center',
      }}>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          Your club admin hasn&apos;t set up any sponsorship packages yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {packages.map(pkg => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            juniorSlots={juniorSlots}
            walletBalance={balance}
            onSuccess={handleSuccess}
          />
        ))}
      </div>

      <section style={{ marginTop: '32px' }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '17px', color: '#fff', margin: '0 0 14px' }}>
          My sponsorships
        </h2>
        <MySponsorships sponsorships={sponsorships} />
      </section>
    </>
  );
}

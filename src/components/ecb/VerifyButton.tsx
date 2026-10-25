'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { verifyQualification } from '@/lib/actions/ecb-courses';

export function VerifyButton({ qualId }: { qualId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleVerify() {
    startTransition(async () => {
      await verifyQualification(qualId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleVerify}
      disabled={isPending}
      style={{
        padding: '2px 10px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        border: '1px solid rgba(155,28,28,0.4)',
        background: 'rgba(155,28,28,0.15)',
        color: '#f87171',
        cursor: isPending ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s',
      }}
    >
      {isPending ? '…' : 'Verify'}
    </button>
  );
}

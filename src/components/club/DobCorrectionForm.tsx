'use client';

import { useState, useTransition } from 'react';
import { correctDobAction } from '@/lib/actions/dob-correction';
import { cardTitle, muted } from '@/components/play/ui';

/** Club officials correct a date. The form does not ask for a document number, and it does not show the date afterwards. */
export function DobCorrectionForm({ clubId }: { clubId: string }) {
  const [memberId, setMemberId] = useState('');
  const [dob, setDob] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const result = await correctDobAction(clubId, memberId.trim(), dob, reason);
          setMessage(result.success ? 'The date of birth was corrected and recorded.' : result.error);
          if (result.success) { setMemberId(''); setDob(''); setReason(''); }
        });
      }}
      style={{ display: 'grid', gap: 8, maxWidth: 420 }}
    >
      <h3 style={cardTitle}>Correct a date of birth</h3>
      <p style={muted}>Only a DBS-checked club admin, coach or welfare officer can do this. The change is logged. Do not type a document number.</p>
      <label>Member id<input value={memberId} onChange={(e) => setMemberId(e.target.value)} required /></label>
      <label>Correct date<input type="date" value={dob} onChange={(e) => setDob(e.target.value)} required /></label>
      <label>Reason<input value={reason} onChange={(e) => setReason(e.target.value)} required maxLength={200} /></label>
      <button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Correct and log'}</button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}

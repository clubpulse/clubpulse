'use client';

import { moderateAction } from '@/lib/actions/community-social';
import { ActionButton } from './ui';

export function ModerationRow({ item }: { item: { reportId: string | null; kind: string; targetId: string; status: string } }) {
  const held = item.status === 'held';
  return (
    <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <ActionButton label={held ? 'Allow' : 'Keep up'} run={() => moderateAction('allow', item.kind, item.targetId, item.reportId)} />
      <ActionButton quiet label="Remove" confirm="Remove this?" run={() => moderateAction('remove', item.kind, item.targetId, item.reportId)} />
      {!held && <ActionButton quiet label="Mark handled" run={() => moderateAction('handled', item.kind, item.targetId, item.reportId)} />}
    </span>
  );
}

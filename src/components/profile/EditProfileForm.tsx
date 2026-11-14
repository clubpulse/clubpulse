'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { UserProfile } from '@/lib/types/user';

export function EditProfileForm({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name);
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, display_name: displayName }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? 'Could not save your profile');
        return;
      }
      toast.success('Profile updated');
      router.push('/profile');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Full name" required maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} />
      <Input label="Display name" required maxLength={40} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      <p className="text-xs text-neutral-500">Your email and sport can&apos;t be changed here.</p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => router.push('/profile')} className="flex-1">Cancel</Button>
        <Button type="submit" loading={loading} className="flex-1">Save changes</Button>
      </div>
    </form>
  );
}

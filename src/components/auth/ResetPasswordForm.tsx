'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// mode "request": ask for a reset email.  mode "update": the recovery link was clicked, set a new password.
export function ResetPasswordForm({ mode }: { mode: 'request' | 'update' }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleRequest(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    setLoading(false);
    // Supabase doesn't error for unknown emails, so this never reveals whether an account exists
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  async function handleUpdate(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Password updated');
    router.push('/dashboard');
    router.refresh();
  }

  if (mode === 'update') {
    return (
      <form onSubmit={handleUpdate} className="space-y-4">
        <Input label="New password" type="password" required minLength={8} autoComplete="new-password"
          value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
        <Button type="submit" loading={loading} className="w-full">Update password</Button>
      </form>
    );
  }

  if (sent) {
    return (
      <p className="text-sm text-neutral-300">
        If an account exists for <span className="font-medium text-white">{email}</span>, a reset link is on its way.
      </p>
    );
  }

  return (
    <form onSubmit={handleRequest} className="space-y-4">
      <Input label="Email" type="email" required autoComplete="email" value={email}
        onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      <Button type="submit" loading={loading} className="w-full">Send reset link</Button>
    </form>
  );
}

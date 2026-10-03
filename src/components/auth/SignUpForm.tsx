'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { completeSignup } from '@/app/auth/signup/actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Role = 'player' | 'volunteer' | 'parent' | 'coach';

const ROLES: { value: Role; label: string; icon: string; desc: string }[] = [
  { value: 'player',    label: 'Player',    icon: '🏏', desc: 'I play cricket and want to earn Scores' },
  { value: 'volunteer', label: 'Volunteer', icon: '🙌', desc: 'I help run and support the game' },
  { value: 'parent',    label: 'Parent',    icon: '👨‍👧', desc: "I follow my child's progress" },
  { value: 'coach',     label: 'Coach',     icon: '🎯', desc: 'I coach a team or squad' },
];

export function SignUpForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);

  function toggleRole(role: Role) {
    setRoles((current) => (current.includes(role) ? current.filter((r) => r !== role) : [...current, role]));
  }

  function handleDetails(event: FormEvent) {
    event.preventDefault();
    setStep(2);
  }

  async function handleCreate() {
    if (roles.length === 0) return;
    setLoading(true);

    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      options: {
        // Kept in metadata so the profile can still be created after email confirmation
        data: { full_name: fullName.trim(), roles },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error || !data.user) {
      setLoading(false);
      toast.error(error?.message ?? 'Sign up failed');
      return;
    }

    // No session yet means email confirmation is on: the callback creates the profile later
    if (!data.session) {
      router.push(`/auth/confirm?email=${encodeURIComponent(email)}`);
      return;
    }

    const result = await completeSignup({ userId: data.user.id, fullName: fullName.trim(), email, roles });
    setLoading(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  if (step === 1) {
    return (
      <form onSubmit={handleDetails} className="space-y-4">
        <Input label="Full name" required autoComplete="name" value={fullName}
          onChange={(e) => setFullName(e.target.value)} placeholder="Ishwar Suresh" />
        <Input label="Email" type="email" required autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <Input label="Password" type="password" required minLength={8} autoComplete="new-password" value={password}
          onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
        <Button type="submit" className="w-full">Continue</Button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-400">How will you use ClubPulse? Select all that apply.</p>
      <div className="space-y-2">
        {ROLES.map((r) => {
          const selected = roles.includes(r.value);
          return (
            <button
              key={r.value}
              type="button"
              onClick={() => toggleRole(r.value)}
              disabled={loading}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition disabled:opacity-60 ${
                selected ? 'border-brand-gold bg-brand-gold/10' : 'border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <span className="text-2xl">{r.icon}</span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-white">{r.label}</span>
                <span className="block text-xs text-neutral-500">{r.desc}</span>
              </span>
              {selected && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-gold text-xs font-bold text-neutral-950">✓</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setStep(1)} disabled={loading} className="flex-1">Back</Button>
        <Button onClick={handleCreate} loading={loading} disabled={roles.length === 0} className="flex-1">
          Create account
        </Button>
      </div>
    </div>
  );
}

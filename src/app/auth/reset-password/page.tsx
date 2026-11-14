import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const updating = mode === 'update';

  return (
    <AuthShell
      title={updating ? 'Choose a new password' : 'Reset your password'}
      subtitle={updating ? undefined : "Enter your email and we'll send you a reset link"}
      footer={<Link href="/auth/sign-in" className="text-brand-gold hover:underline">Back to sign in</Link>}
    >
      <ResetPasswordForm mode={updating ? 'update' : 'request'} />
    </AuthShell>
  );
}

import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';

export default async function EmailSentPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <AuthShell
      title="Check your email"
      footer={<Link href="/auth/sign-in" className="text-brand-gold hover:underline">Back to sign in</Link>}
    >
      <p className="text-sm text-neutral-300">
        We&apos;ve sent a confirmation link{email ? <> to <span className="font-medium text-white">{email}</span></> : ''}.
        Click it to activate your account and finish setting up.
      </p>
      <p className="mt-3 text-xs text-neutral-500">
        Nothing there? Check your spam folder, or sign up again with the same email to get a fresh link.
      </p>
    </AuthShell>
  );
}

import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { SignInForm } from '@/components/auth/SignInForm';
import { safeRedirect } from '@/lib/utils/redirect';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
  const { redirectTo, error } = await searchParams;

  return (
    <AuthShell
      title="Sign in to your account"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/auth/sign-up" className="text-brand-gold hover:underline">Sign up</Link>
        </>
      }
    >
      {error && (
        <p className="mb-4 rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          That link is invalid or has expired. Please sign in or request a new one.
        </p>
      )}
      <SignInForm redirectTo={safeRedirect(redirectTo)} />
    </AuthShell>
  );
}

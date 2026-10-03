import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { SignUpForm } from '@/components/auth/SignUpForm';

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Start stacking Creds today"
      footer={
        <>
          Already have an account?{' '}
          <Link href="/auth/sign-in" className="text-brand-gold hover:underline">Sign in</Link>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}

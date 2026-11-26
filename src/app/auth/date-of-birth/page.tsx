import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/server';
import { DobForm } from '@/components/community/DobForm';
import { ageVerificationEnabled } from '@/lib/age-verification/flag';

export const dynamic = 'force-dynamic';

/** Hard stop after sign-in when the age-verification flag is on and no date of birth is saved. */
export default async function DateOfBirthPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');
  if (!ageVerificationEnabled()) redirect('/dashboard');
  return (
    <main style={{ maxWidth: 480, margin: '10vh auto', padding: 24, fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Add your date of birth</h1>
      <p style={{ marginTop: 0 }}>SHIFTUP needs your date of birth before you can continue. It is saved once. You cannot change it yourself afterwards.</p>
      <DobForm />
    </main>
  );
}

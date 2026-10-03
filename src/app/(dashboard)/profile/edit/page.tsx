import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { fetchProfile } from '@/lib/profile/service';
import { EditProfileForm } from '@/components/profile/EditProfileForm';
import { Card } from '@/components/ui/Card';

export default async function EditProfilePage() {
  const user = await requireUser();
  const profile = await fetchProfile(await createClient(), user.id);
  if (!profile.success) redirect('/profile');

  return (
    <div className="mx-auto max-w-md">
      <Card title="Edit profile">
        <EditProfileForm profile={profile.data} />
      </Card>
    </div>
  );
}

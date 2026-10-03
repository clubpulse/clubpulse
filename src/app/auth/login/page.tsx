import { redirect } from 'next/navigation';

// Old URL, kept so existing links keep working. The sign-in page is /auth/sign-in.
export default function LegacyLoginRedirect() {
  redirect('/auth/sign-in');
}

import { redirect } from 'next/navigation';

// Old URL, kept so existing links keep working. The sign-up page is /auth/sign-up.
// (actions.ts in this folder is still the server action SignUpForm calls.)
export default function LegacySignupRedirect() {
  redirect('/auth/sign-up');
}

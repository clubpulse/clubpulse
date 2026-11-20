'use client';

// Remembers the role page someone last looked at, so Home opens on it next time.

import { useEffect } from 'react';
import { ROLE_COOKIE } from '@/lib/nav/role-pages';

export function RememberRole({ role }: { role: string }) {
  useEffect(() => {
    document.cookie = `${ROLE_COOKIE}=${role}; path=/; max-age=31536000; samesite=lax`;
  }, [role]);
  return null;
}

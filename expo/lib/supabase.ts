import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** True when Supabase credentials are missing — the app runs in demo mode */
export const DEMO_MODE = !url || !anonKey;

// In demo mode we still create a client pointing at a placeholder so imports don't crash,
// but no real network calls will be made.
export const supabase: SupabaseClient = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: !DEMO_MODE,
      persistSession: !DEMO_MODE,
      detectSessionInUrl: false,
    },
  },
);

if (!DEMO_MODE) {
  // Only refresh tokens while the app is in the foreground
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

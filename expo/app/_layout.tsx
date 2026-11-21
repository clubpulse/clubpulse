import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { usePushNotifications } from '../hooks/usePushNotifications';
// Imported for its side effect too: it defines the background task, which must exist as soon
// as the JS loads because the OS can start the app headless just to run it.
import { registerStepsBackgroundSync } from '../lib/backgroundSync';
import { useFonts } from 'expo-font';
import { Syne_700Bold } from '@expo-google-fonts/syne/700Bold';
import { Syne_800ExtraBold } from '@expo-google-fonts/syne/800ExtraBold';
import { AppHeader } from '../components/AppHeader';
import { Wide } from '../components/Wide';
import { colors } from '../constants/theme';

// Every screen opened from a tab gets the app's own top bar with a back button (AppHeader)
const screen = (title: string) => ({
  headerShown: true,
  title,
  // Swiping in from the left edge goes back, as it does everywhere else on an iPhone
  gestureEnabled: true,
  header: (props: React.ComponentProps<typeof AppHeader>) => <AppHeader {...props} />,
});

// Sends signed-out users to sign-in and signed-in users away from the auth screens
function AuthGate() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Register push notifications once authenticated
  usePushNotifications(!!session);

  // Keep steps syncing while the app is closed, for signed-in users only
  useEffect(() => {
    if (session) registerStepsBackgroundSync();
  }, [session]);

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === 'auth';
    // The emailed reset link signs the person in and then asks for a new password, so this
    // screen has to stay put on both sides of that sign-in
    if (segments[0] === 'reset-password') return;
    if (!session && !inAuthGroup) router.replace('/auth/sign-in');
    else if (session && inAuthGroup) router.replace('/');
  }, [session, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      // On a wide screen (an iPad, or a phone on its side) each page sits in a centred column and
      // the top bar stays full width. The tabs centre their own pages so the tab bar can run
      // edge to edge, and website pages keep the whole width because they lay themselves out.
      screenLayout={({ children, route }) =>
        route.name === '(tabs)' ? <>{children}</> : <Wide full={route.name === 'web'}>{children}</Wide>}
    >
      <Stack.Screen name="(tabs)" options={{ title: 'Home' }} />
      <Stack.Screen name="auth" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="sporting-soul" options={screen('My Sporting Soul')} />
      <Stack.Screen name="safeguarding" options={screen('Safeguarding')} />
      <Stack.Screen name="coach/[id]" options={screen('Coach')} />
      <Stack.Screen name="post-shift" options={screen('Post a shift')} />
      <Stack.Screen name="register-child" options={screen('Add a child')} />
      <Stack.Screen name="junior/[id]" options={screen('Junior')} />
      <Stack.Screen name="academy" options={screen('Academy')} />
      <Stack.Screen name="academy-plan" options={screen('My practice plan')} />
      <Stack.Screen name="lesson/[id]" options={screen('Lesson')} />
      <Stack.Screen name="web" options={screen('ClubPulse')} />
      <Stack.Screen name="rewards" options={screen('Rewards')} />
      <Stack.Screen name="auction-room" options={screen('Auction Room')} />
      <Stack.Screen name="store" options={screen('Store')} />
      <Stack.Screen name="odds" options={screen('Prize odds')} />
      <Stack.Screen name="deals" options={screen('Deals and discounts')} />
      <Stack.Screen name="scratch-cards" options={screen('Scratch cards')} />
      <Stack.Screen name="knowledge/[game]" options={screen('Game')} />
      <Stack.Screen name="season-manager" options={screen('Season Manager')} />
      <Stack.Screen name="scratch-rules" options={screen('Scratch card rules')} />
      <Stack.Screen name="scratch-card/[type]" options={screen('Scratch card')} />
      <Stack.Screen name="role/[role]" options={screen('My page')} />
      <Stack.Screen name="community/feed" options={screen('Feed')} />
      <Stack.Screen name="community/nearby" options={screen('Partnerships')} />
      <Stack.Screen name="community/connections" options={screen('Connections')} />
      <Stack.Screen name="community/profile" options={screen('Profile')} />
      <Stack.Screen name="community/chat/[id]" options={screen('Messages')} />
    </Stack>
  );
}

export default function RootLayout() {
  // Headings use the same face as the website. The app does not wait for it to load.
  useFonts({ Syne_700Bold, Syne_800ExtraBold });
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AuthGate />
    </AuthProvider>
  );
}

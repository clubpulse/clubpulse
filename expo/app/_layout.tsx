import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { usePushNotifications } from '../hooks/usePushNotifications';
// Imported for its side effect too: it defines the background task, which must exist as soon
// as the JS loads because the OS can start the app headless just to run it.
import { registerStepsBackgroundSync } from '../lib/backgroundSync';
import { colors } from '../constants/theme';

// Sends signed-out users to sign-in and signed-in users away from the auth screens
function AuthGate() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Register push notifications once authenticated
  usePushNotifications();

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
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="sporting-soul" options={{ headerShown: true, title: 'My Sporting Soul', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.white }} />
      <Stack.Screen name="safeguarding" options={{ headerShown: true, title: 'Safeguarding', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.white }} />
      <Stack.Screen name="coach/[id]" options={{ headerShown: true, title: 'Coach', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.white }} />
      <Stack.Screen name="register-child" options={{ headerShown: true, title: 'Add a child', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.white }} />
      <Stack.Screen name="junior/[id]" options={{ headerShown: true, title: 'Junior', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.white }} />
      <Stack.Screen name="store" options={{ headerShown: true, title: 'Store', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.white }} />
      <Stack.Screen name="odds" options={{ headerShown: true, title: 'Prize odds', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.white }} />
      <Stack.Screen name="deals"options={{ headerShown: true, title: 'Deals & Discounts', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.white }} />
      <Stack.Screen name="scratch-card/[type]" options={{ headerShown: true, title: 'Scratch Card', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.white }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AuthGate />
    </AuthProvider>
  );
}

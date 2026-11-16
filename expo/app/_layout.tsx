import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { colors } from '../constants/theme';

// Sends signed-out users to sign-in and signed-in users away from the auth screens
function AuthGate() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === 'auth';
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
      <Stack.Screen name="sporting-soul" options={{ headerShown: true, title: 'My Sporting Soul', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.white }} />
      <Stack.Screen name="safeguarding" options={{ headerShown: true, title: 'Safeguarding', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.white }} />
      <Stack.Screen name="coach/[id]" options={{ headerShown: true, title: 'Coach', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.white }} />
      <Stack.Screen name="junior/[id]" options={{ headerShown: true, title: 'Junior', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.white }} />
      <Stack.Screen name="store" options={{ headerShown: true, title: 'Store', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.white }} />
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

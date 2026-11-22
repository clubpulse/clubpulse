// Shows a page of the SHIFTUP website inside the app, signed in as the same person.
// Used for the features that only exist on the web so far: video analysis (which needs the
// camera), highlights, progress tracking and coaching.
//
// Every visit starts at /auth/app-session, which signs the web view in and then moves on to the
// page asked for. Only the short-lived access token is sent, and only to our own server.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, PermissionsAndroid, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { supabase } from '../lib/supabase';
import { colors, fonts, radius, spacing } from '../constants/theme';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

// Website pages this screen may show. Keep in step with APP_PATHS in src/lib/auth/app-view.ts.
const IN_APP_PATHS = [
  '/auth', '/analyse', '/highlights', '/coaching-history', '/development', '/player-report', '/log-performance',
  '/coaching', '/qualifications', '/privacy', '/terms', '/api',
];

type Source = { uri: string; method: 'POST'; body: string; headers: Record<string, string> };

export default function WebScreen() {
  const { path, title, camera } = useLocalSearchParams<{ path: string; title?: string; camera?: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const web = useRef<WebView>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (title) navigation.setOptions({ title });
  }, [navigation, title]);

  const start = useCallback(async () => {
    setError(null);
    setLoading(true);
    setSource(null);
    if (!BASE_URL) {
      setError('This build is missing its server address.');
      return;
    }
    // Android only passes the camera to a web page if the app itself already holds it
    if (camera === '1' && Platform.OS === 'android') {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA).catch(() => null);
    }
    // getSession renews the access token first if it is about to run out
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? '';
    setSource({
      uri: `${BASE_URL}/auth/app-session`,
      method: 'POST',
      body: `token=${encodeURIComponent(token)}&next=${encodeURIComponent(path ?? '/analyse')}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }, [camera, path]);

  useEffect(() => {
    start();
  }, [start]);

  // Links inside a page can lead to another page (Development tracking to Analyse, say), so the
  // header follows whatever page is showing. Web titles look like "Analyse | SHIFTUP".
  const followTitle = useCallback((state: WebViewNavigation) => {
    const pageTitle = state.title?.split('|')[0].trim();
    if (pageTitle && !state.loading && !/^https?:|^about:/.test(pageTitle) && pageTitle !== 'SHIFTUP') {
      navigation.setOptions({ title: pageTitle });
    }
  }, [navigation]);

  // Only the coaching and video pages are shown inside the app. The rest of the website (which
  // has its own menus, and pages the app already has natively) stays out of this screen.
  // Other sites open in the phone's browser.
  const allow = useCallback((request: WebViewNavigation) => {
    if (!BASE_URL || request.url.startsWith('about:') || request.url.startsWith('blob:')) return true;
    if (!request.url.startsWith(BASE_URL)) {
      Linking.openURL(request.url).catch(() => null);
      return false;
    }
    const pagePath = request.url.slice(BASE_URL.length).split(/[?#]/)[0] || '/';
    if (IN_APP_PATHS.some((allowed) => pagePath === allowed || pagePath.startsWith(`${allowed}/`))) return true;
    // Coach AI has its own screen in the app
    if (pagePath === '/companion') router.replace('/(tabs)/companion');
    return false;
  }, [router]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {source && !error && (
        <WebView
          ref={web}
          source={source}
          style={styles.web}
          containerStyle={styles.web}
          onLoadEnd={() => setLoading(false)}
          onError={() => setError('Could not load this page. Check your connection.')}
          onHttpError={(event) => {
            if (event.nativeEvent.statusCode >= 500) setError('SHIFTUP is having trouble. Please try again in a moment.');
          }}
          onShouldStartLoadWithRequest={allow}
          onNavigationStateChange={followTitle}
          // The camera preview has to play inside the page, without a tap and not full screen
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          // Once iOS has asked for the camera, do not ask a second time on behalf of the page
          mediaCapturePermissionGrantType="grant"
          sharedCookiesEnabled
          domStorageEnabled
          javaScriptEnabled
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled
          setSupportMultipleWindows={false}
          decelerationRate="normal"
        />
      )}

      {loading && !error && (
        <View style={styles.cover} pointerEvents="none">
          <ActivityIndicator color={colors.gold} />
        </View>
      )}

      {error && (
        <View style={styles.cover}>
          <Text style={[fonts.regular, styles.errorText]}>{error}</Text>
          <Pressable onPress={start} style={({ pressed }) => [styles.retry, pressed && { opacity: 0.8 }]}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  web: { flex: 1, backgroundColor: '#0B0B0B' },
  cover: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  errorText: { textAlign: 'center', marginBottom: spacing.lg },
  retry: { backgroundColor: colors.gold, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.md },
  retryText: { color: colors.navy, fontWeight: '700', fontSize: 16 },
});

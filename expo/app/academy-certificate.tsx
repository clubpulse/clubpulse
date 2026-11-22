// A certificate for a finished Academy track, or for every track (the Graduate certificate).
// The server only issues one to someone who has passed every lesson it covers.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { api, ApiError } from '../lib/api';
import { prettyDate, type Certificate } from '../lib/wellness';
import { colors, display, fonts, radius, spacing } from '../constants/theme';

export default function CertificateScreen() {
  const { track } = useLocalSearchParams<{ track: string }>();
  const [cert, setCert] = useState<Certificate | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Certificate>(`/api/academy/certificate/${encodeURIComponent(String(track))}`).then(setCert).catch((e) => setError(e instanceof ApiError && e.status === 404 ? 'Finish every lesson in this track to earn the certificate.' : 'Could not load the certificate.'));
  }, [track]);

  const share = () => cert && Share.share({ message: `${cert.name} has completed ${cert.title} in the SHIFTUP Academy (${prettyDate(cert.completedOn)}).` });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {!cert && !error && <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xxl }} />}
        {error && <Text style={styles.para}>{error}</Text>}
        {cert && (
          <>
            <View style={styles.paper} accessibilityLabel={`Certificate: ${cert.name}, ${cert.title}`}>
              <Text style={styles.eyebrow}>SHIFTUP ACADEMY</Text>
              <Text style={styles.small}>This certifies that</Text>
              <Text style={styles.name}>{cert.name}</Text>
              <Text style={styles.small}>has completed</Text>
              <Text style={styles.title}>{cert.title}</Text>
              <Text style={styles.small}>{prettyDate(cert.completedOn)}</Text>
            </View>
            <Pressable onPress={share} accessibilityRole="button" style={styles.btn}><Text style={styles.btnText}>Share</Text></Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  para: { fontSize: 15, lineHeight: 23, color: colors.text },
  paper: { borderRadius: radius.lg, borderWidth: 2, borderColor: colors.gold, backgroundColor: colors.navyLight, padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  eyebrow: { color: colors.gold, fontWeight: '800', letterSpacing: 2, fontSize: 12 },
  small: { ...fonts.small, textAlign: 'center' },
  name: { fontFamily: display.heavy, fontSize: 28, color: colors.white, textAlign: 'center' },
  title: { fontFamily: display.bold, fontSize: 22, color: colors.gold, textAlign: 'center' },
  btn: { backgroundColor: colors.gold, borderRadius: radius.pill, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: colors.background, fontWeight: '800', fontSize: 15 },
});

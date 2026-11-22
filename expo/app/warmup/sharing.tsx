// Sharing: whether your club's coaches may see your readiness averages. Off unless you turn it on,
// adults only, averages only (never your notes or a single day), and you can turn it off at any time.

import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { api } from '../../lib/api';
import type { ShareClub } from '../../lib/wellness';
import { colors, display, fonts, radius, spacing } from '../../constants/theme';

const PINK = '#F472B6';

export default function SharingScreen() {
  const [clubs, setClubs] = useState<ShareClub[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setClubs((await api<{ clubs: ShareClub[] }>('/api/wellness/share')).clubs); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load your settings.'); setClubs([]); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const set = async (c: ShareClub, share: boolean) => {
    setNote(null);
    setClubs((list) => list && list.map((x) => (x.clubId === c.clubId ? { ...x, share } : x)));
    try { await api('/api/wellness/share', { method: 'POST', body: { clubId: c.clubId, share } }); }
    catch (e) { setNote(e instanceof Error ? e.message : 'Could not change that.'); load(); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">Sharing with your coach</Text>
        <Text style={styles.para}>Your check-ins are private. If you choose, your club’s coaches can see your averages for sleep, mood, soreness and stress, and how many days you checked in. They never see your notes or a single day. It is off until you turn it on, and you can turn it off at any time.</Text>
        <Text style={fonts.small}>Sharing is not available for under-18s.</Text>
        {error && <Text style={[fonts.small, { color: colors.danger }]}>{error}</Text>}
        {!clubs && !error && <ActivityIndicator color={PINK} />}
        {clubs && clubs.length === 0 && !error && <Text style={styles.para}>Join a club to see sharing choices.</Text>}
        {clubs?.map((c) => (
          <View key={c.clubId} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{c.name}</Text>
              <Text style={fonts.small}>{c.canShare ? (c.share ? 'Coaches can see your averages' : 'Not shared') : 'Not available for under-18s'}</Text>
            </View>
            <Switch value={c.share} disabled={!c.canShare} onValueChange={(v) => set(c, v)} trackColor={{ true: PINK }} accessibilityLabel={`Share readiness averages with ${c.name}`} />
          </View>
        ))}
        {note && <Text style={[fonts.small, { color: colors.white }]} accessibilityRole="alert">{note}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { fontFamily: display.heavy, fontSize: 26, color: colors.white },
  para: { fontSize: 15, lineHeight: 23, color: colors.text },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.navyLight, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  name: { fontFamily: display.bold, fontSize: 16, color: colors.white },
});

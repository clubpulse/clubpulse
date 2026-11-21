// Connections: people who want to connect with you, the people you are connected to (tap to
// message) and requests you have sent.

import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { BLUE, type ConnectionRow } from '../../lib/community';
import { Avatar } from '../../components/CommunityBits';
import { colors, display, fonts, radius, spacing } from '../../constants/theme';

export default function ConnectionsScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<ConnectionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setRows((await api<{ connections: ConnectionRow[] }>('/api/community/connections')).connections); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load your connections.'); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const answer = async (userId: string, yes: boolean) => {
    try { await api('/api/community/connections', { method: 'POST', body: { userId, yes } }); } catch { /* the reload shows what happened */ }
    load();
  };

  const group = (state: ConnectionRow['state']) => (rows ?? []).filter((r) => r.state === state);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} tintColor={BLUE} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        {error && <Text style={[fonts.small, { color: colors.danger }]}>{error}</Text>}
        {!rows && !error && <ActivityIndicator color={BLUE} style={{ marginTop: spacing.xl }} />}

        {group('incoming').length > 0 && <Text style={styles.section} accessibilityRole="header">Want to connect with you</Text>}
        {group('incoming').map((r) => (
          <View key={r.id} style={styles.card}>
            <Pressable onPress={() => router.push({ pathname: '/community/profile', params: { id: r.person.id } })} style={styles.row} accessibilityRole="button">
              <Avatar name={r.person.name} />
              <View style={{ flex: 1 }}><Text style={styles.name}>{r.person.name}</Text><Text style={fonts.small}>{r.person.club ?? 'ClubPulse member'}</Text></View>
            </Pressable>
            <View style={styles.row}>
              <Pressable onPress={() => answer(r.person.id, false)} style={[styles.btn, styles.btnGhost]} accessibilityRole="button"><Text style={styles.btnGhostText}>Not now</Text></Pressable>
              <Pressable onPress={() => answer(r.person.id, true)} style={[styles.btn, { backgroundColor: BLUE }]} accessibilityRole="button"><Text style={styles.btnText}>Connect</Text></Pressable>
            </View>
          </View>
        ))}

        <Text style={styles.section} accessibilityRole="header">Connected</Text>
        {rows && group('connected').length === 0 && <Text style={fonts.small}>Nobody yet. Find cricket people under Partnerships.</Text>}
        {group('connected').map((r) => (
          <Pressable key={r.id} onPress={() => router.push({ pathname: '/community/chat/[id]', params: { id: r.id } })} style={[styles.card, styles.row]} accessibilityRole="button" accessibilityLabel={`${r.person.name}. Open messages`}>
            <Avatar name={r.person.name} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{r.person.name}</Text>
              <Text style={fonts.small} numberOfLines={1}>{r.last ?? 'Say hello'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
          </Pressable>
        ))}

        {group('requested').length > 0 && <Text style={styles.section} accessibilityRole="header">Waiting for their answer</Text>}
        {group('requested').map((r) => (
          <View key={r.id} style={[styles.card, styles.row]}>
            <Avatar name={r.person.name} tint="#93C5FD" />
            <View style={{ flex: 1 }}><Text style={styles.name}>{r.person.name}</Text><Text style={fonts.small}>{r.person.club ?? 'ClubPulse member'}</Text></View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  section: { fontFamily: display.heavy, fontSize: 17, color: colors.white, marginTop: spacing.sm },
  card: { backgroundColor: colors.navyLight, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { fontSize: 15, fontWeight: '700', color: colors.white },
  btn: { flex: 1, minHeight: 46, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#04091A', fontWeight: '800', fontSize: 15 },
  btnGhost: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  btnGhostText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});

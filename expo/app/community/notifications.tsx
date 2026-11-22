// Notifications: someone wants to connect, someone accepted. Opening a request goes to My Squad.

import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '../../lib/api';
import { BLUE, ago, type Notice } from '../../lib/community';
import { colors, fonts, radius, spacing } from '../../constants/theme';

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Notice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setItems((await api<{ items: Notice[] }>('/api/community/notifications')).items); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load notifications.'); setItems([]); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const open = async (n: Notice) => {
    if (!n.read) { try { await api('/api/community/notifications', { method: 'POST', body: { id: n.id } }); } catch { /* best effort */ } }
    // A parent is taken to the answer they need to give; everyone else to My Squad
    router.push(n.kind === 'parent_approval_needed' ? '/community/approvals' : '/community/connections');
  };
  const readAll = async () => { try { await api('/api/community/notifications', { method: 'POST', body: {} }); } catch { /* best effort */ } load(); };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} tintColor={BLUE} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        {error && <Text style={[fonts.small, { color: colors.danger }]}>{error}</Text>}
        {!items && <ActivityIndicator color={BLUE} />}
        {items && items.some((n) => !n.read) && <Pressable onPress={readAll} accessibilityRole="button"><Text style={styles.link}>Mark all as read</Text></Pressable>}
        {items && items.length === 0 && !error && <Text style={[fonts.small, { textAlign: 'center', marginTop: spacing.xl }]}>Nothing yet. Requests to connect appear here.</Text>}
        {items?.map((n) => (
          <Pressable key={n.id} onPress={() => open(n)} accessibilityRole="button" style={[styles.card, n.read && { opacity: 0.65 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{n.title}</Text>
              {!!n.body && <Text style={fonts.small}>{n.body}</Text>}
              <Text style={fonts.small}>{ago(n.createdAt)}</Text>
            </View>
            {!n.read && <View style={styles.dot} />}
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.navyLight, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  title: { fontSize: 16, fontWeight: '700', color: colors.white },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: BLUE },
  link: { fontSize: 14, fontWeight: '600', color: BLUE },
});

// Approvals: for a parent. Two young people have said yes to connecting; each child's verified parent is asked, and
// the connection opens only when each child has a parent who approved. Any parent declining closes it. The same
// decisions as Parent Community on the website, through /api/community/approvals.

import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { api } from '../../lib/api';
import { BLUE, approvalMessage, type ApprovalRequest, type ApprovalState } from '../../lib/community';
import { colors, display, fonts, radius, spacing } from '../../constants/theme';

export default function ApprovalsScreen() {
  const [items, setItems] = useState<ApprovalRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setItems((await api<{ approvals: ApprovalRequest[] }>('/api/community/approvals')).approvals); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load your approvals.'); setItems([]); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const send = async (a: ApprovalRequest, approve: boolean) => {
    const key = `${a.connectionId}:${a.childId}`;
    setBusy(key); setNotice(null);
    try {
      const r = await api<{ state: ApprovalState }>('/api/community/approvals', { method: 'POST', body: { connectionId: a.connectionId, childId: a.childId, approve } });
      setNotice(approvalMessage(r.state)); setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save your answer. Try again.'); }
    setBusy(null);
    load();
  };

  // A tap on the wrong button should not decide something about a child, so each answer is confirmed first
  const ask = (a: ApprovalRequest, approve: boolean) => Alert.alert(
    approve ? 'Approve this connection?' : 'Decline this connection?',
    approve
      ? `${a.childName} and ${a.otherName} will be able to message each other once both young people’s parents have said yes.`
      : `This closes the request. ${a.childName} and ${a.otherName} will not be connected.`,
    [{ text: 'Cancel', style: 'cancel' }, { text: approve ? 'Approve' : 'Decline', style: approve ? 'default' : 'destructive', onPress: () => { void send(a, approve); } }],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} tintColor={BLUE} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <Text style={fonts.small}>Nothing happens unless you approve. Both young people’s parents are asked, and any parent can say no.</Text>
        {error && <Text accessibilityRole="alert" style={[fonts.small, { color: colors.danger }]}>{error}</Text>}
        {notice && <Text accessibilityRole="alert" style={[fonts.small, { color: colors.success }]}>{notice}</Text>}
        {!items && !error && <ActivityIndicator color={BLUE} style={{ marginTop: spacing.xl }} />}
        {items && items.length === 0 && !error && <Text style={[fonts.small, { textAlign: 'center', marginTop: spacing.xl }]}>Nothing is waiting for you.</Text>}

        {items?.map((a) => {
          const key = `${a.connectionId}:${a.childId}`;
          return (
            <View key={key} style={styles.card}>
              <Text style={styles.title}>{a.childName} would like to connect with {a.otherName}</Text>
              {!!a.otherClub && <Text style={fonts.small}>{a.otherName} is from {a.otherClub}.</Text>}
              {a.decided === 'approved' ? (
                <Text style={[fonts.small, { color: BLUE }]}>You have said yes. Waiting for the other young person’s parent.</Text>
              ) : (
                <View style={styles.row}>
                  <Pressable disabled={busy === key} onPress={() => ask(a, false)} style={[styles.btn, styles.btnGhost, busy === key && { opacity: 0.5 }]} accessibilityRole="button" accessibilityLabel={`Decline ${a.childName} connecting with ${a.otherName}`}>
                    <Text style={styles.btnGhostText}>Decline</Text>
                  </Pressable>
                  <Pressable disabled={busy === key} onPress={() => ask(a, true)} style={[styles.btn, { backgroundColor: BLUE }, busy === key && { opacity: 0.5 }]} accessibilityRole="button" accessibilityLabel={`Approve ${a.childName} connecting with ${a.otherName}`}>
                    <Text style={styles.btnText}>Approve</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.navyLight, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md },
  title: { fontFamily: display.heavy, fontSize: 16, color: colors.white },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  btn: { flex: 1, minHeight: 46, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#04091A', fontWeight: '800', fontSize: 15 },
  btnGhost: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  btnGhostText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});

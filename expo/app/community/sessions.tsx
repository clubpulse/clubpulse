// Nets and Games: nets sessions and pick-up games near you. Adult sessions are for adults; junior sessions are
// run by a club's coach for that club's juniors. Behind the Community switch.

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { BLUE, SCOPES, type Scope } from '../../lib/community';
import { Chips } from '../../components/CommunityBits';
import { colors, display, fonts, radius, spacing } from '../../constants/theme';

type SessionCard = {
  id: string; kind: 'nets' | 'pickup'; band: 'adult' | 'junior'; title: string; note: string; place: string; startsAt: string;
  capacity: number; taken: number; club: string; distance: string | null; host: string; hostId: string; mine: boolean; joined: boolean; canJoin: boolean;
};
type Kind = 'all' | 'nets' | 'pickup';

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function SessionsScreen() {
  const [scope, setScope] = useState<Scope>('miles');
  const [kind, setKind] = useState<Kind>('all');
  const [list, setList] = useState<SessionCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setList(null);
    try { setList((await api<{ sessions: SessionCard[] }>(`/api/community/sessions?scope=${scope}${kind === 'all' ? '' : `&kind=${kind}`}`)).sessions); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load sessions.'); setList([]); }
  }, [scope, kind]);
  useEffect(() => { load(); }, [load]);

  const toggle = async (s: SessionCard) => {
    setNote(null);
    try { await api('/api/community/sessions', { method: 'POST', body: { sessionId: s.id, join: !s.joined } }); await load(); }
    catch (e) { setNote(e instanceof Error ? e.message : 'That did not work.'); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Chips value={scope} onChange={setScope} options={SCOPES.map((s) => ({ key: s.key, label: s.label }))} />
        <Chips value={kind} onChange={setKind} options={[{ key: 'all', label: 'All' }, { key: 'nets', label: 'Nets' }, { key: 'pickup', label: 'Pick-up games' }]} />
        {error && <Text style={[fonts.small, { color: colors.danger }]}>{error}</Text>}
        {!list && !error && <ActivityIndicator color={BLUE} style={{ marginTop: spacing.xl }} />}
        {list && list.length === 0 && !error && <Text style={[fonts.small, { textAlign: 'center', marginTop: spacing.xl }]}>Nothing coming up here yet.</Text>}
        {list?.map((s) => (
          <View key={s.id} style={styles.card}>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={fonts.small}>{s.kind === 'nets' ? 'Nets' : 'Pick-up game'} · {s.band === 'junior' ? 'Juniors' : 'Adults'} · {when(s.startsAt)}</Text>
            <Text style={fonts.regular}>{s.place} · {s.club}{s.distance ? ` · ${s.distance}` : ''}</Text>
            {s.note ? <Text style={fonts.small}>{s.note}</Text> : null}
            <Text style={fonts.small}>{s.taken} of {s.capacity} places taken · hosted by {s.host}</Text>
            {!s.mine && (s.canJoin || s.joined) && (
              <Pressable onPress={() => toggle(s)} accessibilityRole="button" style={[styles.btn, s.joined && styles.ghost]}>
                <Text style={[styles.btnText, s.joined && { color: colors.text }]}>{s.joined ? 'Leave' : 'Join'}</Text>
              </Pressable>
            )}
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
  card: { backgroundColor: colors.navyLight, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: 4 },
  title: { fontFamily: display.bold, fontSize: 17, color: colors.white },
  btn: { backgroundColor: BLUE, borderRadius: radius.pill, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.navyBorder },
  btnText: { color: '#04091A', fontWeight: '800', fontSize: 15 },
});

// Short for Saturday: clubs that need players for a game. Say "I can play" and the club sees your name and club.
// Adults only. Clubs post from the website. Behind the Community switch.

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { BLUE, SCOPES, WITHIN, type Scope } from '../../lib/community';
import { Chips } from '../../components/CommunityBits';
import { colors, display, fonts, radius, spacing } from '../../constants/theme';

type Shortage = { id: string; club: string; format: string; playAt: string; need: number; place: string; note: string; distance: string | null; mine: boolean; replied: boolean; canReply: boolean };
const FORMAT: Record<string, string> = { league: 'League game', friendly: 'Friendly', t20: 'T20', indoor: 'Indoor' };
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function ShortagesScreen() {
  const [scope, setScope] = useState<Scope>('miles');
  const [within, setWithin] = useState<'5' | '10' | '25' | null>(null);
  const [list, setList] = useState<Shortage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setList(null);
    try { setList((await api<{ shortages: Shortage[] }>(`/api/community/shortages?scope=${scope}${within ? `&within=${within}` : ''}`)).shortages); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load games.'); setList([]); }
  }, [scope, within]);
  useEffect(() => { load(); }, [load]);

  const toggle = async (s: Shortage) => {
    setNote(null);
    try { await api('/api/community/shortages', { method: 'POST', body: { shortageId: s.id, reply: !s.replied } }); await load(); }
    catch (e) { setNote(e instanceof Error ? e.message : 'That did not work.'); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Chips value={scope} onChange={setScope} options={SCOPES.map((s) => ({ key: s.key, label: s.label }))} />
        <Chips value={within} onChange={(k) => setWithin(within === k ? null : k)} options={WITHIN} />
        {note && <Text style={[fonts.small, { color: colors.danger }]}>{note}</Text>}
        {error && <Text style={[fonts.small, { color: colors.danger }]}>{error}</Text>}
        {!list && !error && <ActivityIndicator color={BLUE} style={{ marginTop: spacing.xl }} />}
        {list && list.length === 0 && !error && <Text style={[fonts.small, { textAlign: 'center', marginTop: spacing.xl }]}>No clubs are short of players near you right now.</Text>}
        {list?.map((s) => (
          <View key={s.id} style={styles.card}>
            <Text style={styles.title}>{s.club} needs {s.need} player{s.need === 1 ? '' : 's'}</Text>
            <Text style={fonts.small}>{FORMAT[s.format] ?? s.format} · {when(s.playAt)}{s.distance ? ` · ${s.distance}` : ''}</Text>
            <Text style={fonts.regular}>{s.place}</Text>
            {s.note ? <Text style={fonts.small}>{s.note}</Text> : null}
            {!s.mine && (s.canReply || s.replied) && (
              <Pressable onPress={() => toggle(s)} accessibilityRole="button" style={[styles.btn, s.replied && styles.ghost]}>
                <Text style={[styles.btnText, s.replied && { color: colors.text }]}>{s.replied ? 'I can’t play after all' : 'I can play'}</Text>
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.navyLight, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.xs },
  title: { fontFamily: display.heavy, fontSize: 18, color: colors.white },
  btn: { marginTop: spacing.sm, minHeight: 44, borderRadius: radius.pill, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  btnText: { color: '#04091A', fontWeight: '800', fontSize: 15 },
});

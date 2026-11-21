// Form Guide: for a coach, the players they work with and each one's technique progress. Opening
// a player shows, for each kind of analysis they have saved, the latest against the one before
// and the trend across their recent sessions. The same view as the coach tab on the website.

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { colors, display, fonts, radius, spacing } from '../constants/theme';

type Change = { key: string; label: string; now: number; before: number; text: string };
type Comparison = { when: string | null; headline: string; better: Change[]; worse: Change[]; same: Change[] };
type Direction = 'improving' | 'slipping' | 'steady' | 'mixed';
type Trend = { marks: number[]; direction: Direction; text: string; measures: Array<{ key: string; label: string; direction: Direction; text: string }> };
type Progress = { kind: string; when: string | null; sessions: number; overall: number; comparison: Comparison | null; trend: Trend | null };
type Player = { id: string; name: string; sessions: number };
type Loaded = { state: 'loading' } | { state: 'ready'; progress: Progress[] } | { state: 'error'; message: string };

const AMBER = '#FBBF24';
const BLUE = '#60A5FA';
const TONE: Record<Direction, string> = { improving: colors.success, slipping: AMBER, mixed: colors.textMuted as string, steady: colors.textMuted as string };
// Bars are scaled between the lowest and highest mark in the run, so a small rise is still visible
const barHeight = (mark: number, all: number[]) => {
  const lo = Math.min(...all); const hi = Math.max(...all);
  return hi === lo ? 70 : 30 + (70 * (mark - lo)) / (hi - lo);
};
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export default function PlayerProgressScreen() {
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Record<string, Loaded>>({});
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setPlayers((await api<{ players: Player[] }>('/api/analysis/player-progress')).players); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load your players.'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (id: string) => {
    if (open === id) return setOpen(null);
    setOpen(id);
    if (loaded[id]?.state === 'ready') return;
    setLoaded((l) => ({ ...l, [id]: { state: 'loading' } }));
    try {
      const d = await api<{ progress: Progress[] }>(`/api/analysis/player-progress?player=${id}`);
      setLoaded((l) => ({ ...l, [id]: { state: 'ready', progress: d.progress } }));
    } catch (e) {
      setLoaded((l) => ({ ...l, [id]: { state: 'error', message: e instanceof Error ? e.message : 'Could not load this player.' } }));
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.orange} onRefresh={async () => { setRefreshing(true); setLoaded({}); setOpen(null); await load(); setRefreshing(false); }} />}>
        <Text style={fonts.small}>Technique analyses saved by players you have a confirmed or completed session with.</Text>
        {error && <Text style={[fonts.small, { color: colors.danger }]}>{error}</Text>}
        {!players && !error && <ActivityIndicator color={colors.orange} style={{ marginTop: spacing.xl }} />}
        {players?.length === 0 && <Text style={fonts.small}>No players yet. A player appears here once you confirm a session with them.</Text>}

        {players?.map((p) => {
          const state = loaded[p.id];
          const isOpen = open === p.id;
          return (
            <View key={p.id} style={styles.card}>
              <Pressable onPress={() => toggle(p.id)} style={styles.head} accessibilityRole="button" accessibilityState={{ expanded: isOpen }} accessibilityLabel={`${p.name}. ${isOpen ? 'Hide' : 'Show'} progress`}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{p.name}</Text>
                  <Text style={fonts.small}>{p.sessions} {p.sessions === 1 ? 'session' : 'sessions'} with you</Text>
                </View>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted as string} />
              </Pressable>

              {isOpen && state?.state === 'loading' && <ActivityIndicator color={colors.orange} style={{ marginBottom: spacing.md }} />}
              {isOpen && state?.state === 'error' && <Text style={[fonts.small, { color: colors.danger, marginBottom: spacing.md }]}>{state.message}</Text>}
              {isOpen && state?.state === 'ready' && state.progress.length === 0 && <Text style={[fonts.small, { marginBottom: spacing.md }]}>{p.name} has not saved a technique analysis yet.</Text>}
              {isOpen && state?.state === 'ready' && state.progress.map((g) => <Kind key={g.kind} g={g} />)}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function Kind({ g }: { g: Progress }) {
  const c = g.comparison;
  const groups = c ? ([['What got better', c.better, colors.success], ['What did not get better', c.worse, AMBER], ['About the same', c.same, colors.textMuted as string]] as const) : [];
  return (
    <View style={styles.kind}>
      <Text style={styles.kindTitle}>{g.kind}</Text>
      <Text style={fonts.small}>Latest {g.overall}/100{g.when ? ` on ${day(g.when)}` : ''} · {g.sessions} saved</Text>

      {!c ? (
        <Text style={styles.body}>Only one saved so far. The comparison appears after the next one.</Text>
      ) : (
        <>
          <Text style={styles.headline}>{c.headline}</Text>
          {groups.map(([title, list, tone]) => list.length > 0 && (
            <View key={title} style={{ gap: 6 }}>
              <Text style={[styles.groupTitle, { color: tone }]}>{title}</Text>
              {list.map((x) => (
                <Text key={x.key} style={styles.body}><Text style={styles.strong}>{x.label}</Text> ({x.before} to {x.now}): {x.text}</Text>
              ))}
            </View>
          ))}
        </>
      )}

      {g.trend && (
        <View style={styles.trend}>
          <Text style={[styles.groupTitle, { color: BLUE }]}>The trend</Text>
          <View style={styles.bars} accessible accessibilityLabel={g.trend.text}>
            {g.trend.marks.map((mark, i) => (
              <View key={i} style={styles.barSlot}>
                <View style={{ height: `${barHeight(mark, g.trend!.marks)}%`, borderRadius: 4, backgroundColor: i === g.trend!.marks.length - 1 ? BLUE : 'rgba(96,165,250,0.35)' }} />
              </View>
            ))}
          </View>
          <Text style={styles.body}>{g.trend.text}</Text>
          {g.trend.measures.map((m) => (
            <Text key={m.key} style={styles.body}><Text style={[styles.strong, { color: TONE[m.direction] }]}>{m.label}</Text>: {m.text}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.navyLight, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 64 },
  name: { fontSize: 16, fontWeight: '700', color: colors.white },
  kind: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.md, gap: spacing.sm },
  kindTitle: { fontFamily: display.bold, fontSize: 16, color: colors.white },
  headline: { fontSize: 15, fontWeight: '700', color: colors.white, marginTop: 2 },
  groupTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  body: { fontSize: 14, lineHeight: 20, color: colors.text },
  strong: { fontWeight: '700', color: colors.white },
  trend: { gap: spacing.sm, marginTop: spacing.xs },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 44 },
  barSlot: { flex: 1, maxWidth: 44, height: '100%', justifyContent: 'flex-end' },
});

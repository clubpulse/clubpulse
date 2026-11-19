// Season Manager: pick an eleven and a game plan for each of eight matches, one a day. Playing
// tires players and resting restores them, so the squad has to be rotated. The server holds the
// season and works out every result; this screen only chooses the team and shows what happened.

import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '../lib/api';
import { colors, fonts, radius, spacing } from '../constants/theme';

type Role = 'bat' | 'bowl' | 'all' | 'keep';
type Plan = 'steady' | 'balanced' | 'attack';
type Player = { id: number; name: string; role: Role; bat: number; bowl: number; form: number; fatigue: number };
type Report = {
  match: number; opponent: string; yourScore: number; theirScore: number; won: boolean; tied: boolean;
  topBatter: { name: string; runs: number }; topBowler: { name: string; wickets: number }; note: string;
};
type TableRow = { name: string; played: number; won: number; points: number; you: boolean };
type Season = {
  match: number; matches: number; over: boolean; canPlayToday: boolean;
  opponent: { name: string; level: 'weaker' | 'even' | 'stronger' } | null;
  squad: Player[]; suggested: number[]; reports: Report[]; table: TableRow[]; place: number; earned: number;
};
type Status = { note: string | null; winAmount: number; placeAmounts: number[]; season: Season | null; canStart: boolean };
type PlayResult = { report: Report; amount: number; bonus: number; capped: boolean; over: boolean; place: number; card: boolean };

const TEAM = 11;
const MIN_BOWLERS = 5;
const ROLE: Record<Role, { label: string; color: string }> = {
  bat: { label: 'Batter', color: '#60A5FA' },
  bowl: { label: 'Bowler', color: '#F97316' },
  all: { label: 'All-rounder', color: '#A78BFA' },
  keep: { label: 'Keeper', color: '#22C55E' },
};
const PLANS: Array<{ key: Plan; label: string; detail: string }> = [
  { key: 'steady', label: 'Steady', detail: 'Fewer wickets lost, slower scoring' },
  { key: 'balanced', label: 'Balanced', detail: 'Play each ball on its merits' },
  { key: 'attack', label: 'Attack', detail: 'Faster scoring, more wickets at risk' },
];
const LEVEL = { weaker: 'Weaker than you', even: 'About your level', stronger: 'Stronger than you' };
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
const formText = (f: number) => (f >= 2 ? 'On fire' : f === 1 ? 'In form' : f === 0 ? 'Steady' : f === -1 ? 'Out of form' : 'Struggling');
const formColor = (f: number) => (f > 0 ? colors.success : f < 0 ? colors.danger : (colors.textMuted as string));
const fatigueColor = (f: number) => (f >= 60 ? colors.danger : f >= 30 ? colors.gold : colors.success);

export default function SeasonManagerScreen() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [xi, setXi] = useState<number[] | null>(null);
  const [plan, setPlan] = useState<Plan>('balanced');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PlayResult | null>(null);
  const [tab, setTab] = useState<'team' | 'table' | 'results'>('team');

  const load = useCallback(async () => {
    try {
      setStatus(await api<Status>('/api/games/manager'));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load your season.');
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const season = status?.season ?? null;
  const picked = xi ?? season?.suggested ?? [];
  const pickedSet = useMemo(() => new Set(picked), [picked]);

  // The same checks the server makes, so the button only lights up for a team that can play
  const problem = useMemo(() => {
    if (!season) return null;
    const team = season.squad.filter((p) => pickedSet.has(p.id));
    if (team.length !== TEAM) return `Pick ${TEAM} players. You have ${team.length}.`;
    if (!team.some((p) => p.role === 'keep')) return 'You need a wicket-keeper.';
    if (team.filter((p) => p.role === 'bowl' || p.role === 'all').length < MIN_BOWLERS) return `You need at least ${MIN_BOWLERS} bowlers or all-rounders.`;
    return null;
  }, [season, pickedSet]);

  function toggle(id: number) {
    setResult(null);
    setXi(pickedSet.has(id) ? picked.filter((p) => p !== id) : picked.length >= TEAM ? picked : [...picked, id]);
  }

  async function start() {
    setBusy(true);
    setError(null);
    try {
      setStatus(await api<Status>('/api/games/manager', { method: 'POST' }));
      setXi(null);
      setResult(null);
      setTab('team');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start a season.');
    }
    setBusy(false);
  }

  async function play() {
    if (problem || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ result: PlayResult; status: Status }>('/api/games/manager/play', { method: 'POST', body: { xi: picked, plan } });
      setResult(res.result);
      setStatus(res.status);
      setXi(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not play the match.');
    }
    setBusy(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {!status && !error && <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xxl }} />}
        {error && <View style={[styles.card, { borderColor: colors.danger }]}><Text style={fonts.regular}>{error}</Text></View>}
        {status?.note && <Text style={fonts.small}>{status.note}</Text>}

        {/* ── No season yet ── */}
        {status && !season && (
          <View style={styles.card}>
            <Text style={styles.h1}>Run your own club side</Text>
            <Text style={[fonts.regular, { marginTop: 6 }]}>
              You get a squad of 16 and eight league matches, one a day. Pick eleven and a game plan for each. Playing tires people out, so rotate.
            </Text>
            {status.winAmount > 0 && (
              <Text style={[fonts.small, { marginTop: spacing.sm }]}>
                {status.winAmount} Scores a win. Finish 1st, 2nd or 3rd for {status.placeAmounts.join(', ')} more.
              </Text>
            )}
            {status.canStart && (
              <Pressable onPress={start} disabled={busy} style={styles.goldBtn} accessibilityRole="button">
                {busy ? <ActivityIndicator color={colors.background} /> : <Text style={styles.goldBtnText}>Start a season</Text>}
              </Pressable>
            )}
          </View>
        )}

        {/* ── The match just played ── */}
        {result && (
          <View style={[styles.card, { borderColor: result.report.won ? 'rgba(34,197,94,0.5)' : colors.border as string }]}>
            <Text style={[styles.h1, { color: result.report.won ? colors.success : result.report.tied ? colors.gold : colors.white }]}>
              {result.report.won ? 'You won' : result.report.tied ? 'A tie' : 'You lost'}
            </Text>
            <Text style={styles.scoreline}>You {result.report.yourScore} · {result.report.opponent} {result.report.theirScore}</Text>
            <Text style={fonts.small}>Top batter: {result.report.topBatter.name}, {result.report.topBatter.runs}</Text>
            <Text style={fonts.small}>Top bowler: {result.report.topBowler.name}, {result.report.topBowler.wickets} wickets</Text>
            <Text style={[fonts.regular, { marginTop: 6 }]}>{result.report.note}</Text>
            {result.amount + result.bonus > 0 && <Text style={[fonts.title, { color: colors.gold, marginTop: 6 }]}>+{result.amount + result.bonus} Scores</Text>}
            {result.capped && result.amount + result.bonus === 0 && <Text style={[fonts.small, { marginTop: 6 }]}>Weekly Scores limit reached.</Text>}
            {result.card && <Text style={[fonts.regular, { color: colors.gold, marginTop: 6 }]}>🎟️ League champions. You earned a scratch card.</Text>}
          </View>
        )}

        {season && (
          <>
            {/* ── Where the season stands ── */}
            <View style={styles.hero}>
              <Text style={styles.heroEyebrow}>
                {season.over ? 'Season over' : `Match ${season.match} of ${season.matches}`} · {ordinal(season.place)} in the league
              </Text>
              {season.over ? (
                <Text style={styles.heroTitle}>You finished {ordinal(season.place)}</Text>
              ) : (
                <>
                  <Text style={styles.heroTitle}>v {season.opponent?.name}</Text>
                  <Text style={styles.heroSub}>{season.opponent ? LEVEL[season.opponent.level] : ''}</Text>
                </>
              )}
              {season.earned > 0 && <Text style={styles.heroSub}>{season.earned} Scores earned this season</Text>}
            </View>

            {season.over && status?.canStart && (
              <Pressable onPress={start} disabled={busy} style={styles.goldBtn} accessibilityRole="button">
                {busy ? <ActivityIndicator color={colors.background} /> : <Text style={styles.goldBtnText}>Start a new season</Text>}
              </Pressable>
            )}

            <View style={styles.tabs}>
              {(['team', 'table', 'results'] as const).map((t) => (
                <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === t }}>
                  <Text style={[styles.tabText, tab === t && { color: colors.white }]}>{t === 'team' ? 'Squad' : t === 'table' ? 'League' : 'Results'}</Text>
                </Pressable>
              ))}
            </View>

            {/* ── Squad and selection ── */}
            {tab === 'team' && (
              <>
                {!season.over && !season.canPlayToday && (
                  <View style={styles.card}><Text style={fonts.regular}>Today&apos;s match is played. Your squad rests overnight and the next match is tomorrow.</Text></View>
                )}
                {!season.over && season.canPlayToday && (
                  <View style={styles.pickRow}>
                    <Text style={fonts.title}>Pick your eleven ({picked.length}/{TEAM})</Text>
                    <Pressable onPress={() => { setXi(season.suggested); setResult(null); }} accessibilityRole="button">
                      <Text style={styles.link}>Suggest a team</Text>
                    </Pressable>
                  </View>
                )}
                {season.squad.map((p) => {
                  const on = pickedSet.has(p.id);
                  const canPick = !season.over && season.canPlayToday;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => canPick && toggle(p.id)}
                      disabled={!canPick}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={`${p.name}, ${ROLE[p.role].label}, ${formText(p.form)}, ${p.fatigue >= 60 ? 'tired' : p.fatigue >= 30 ? 'a bit tired' : 'fresh'}`}
                      style={[styles.player, on && canPick && styles.playerOn]}
                    >
                      {canPick && <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? colors.brandSky : colors.textSubtle} />}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.playerName}>{p.name}</Text>
                        <Text style={[styles.role, { color: ROLE[p.role].color }]}>
                          {ROLE[p.role].label} · Bat {p.bat} · Bowl {p.bowl}
                        </Text>
                        <View style={styles.fatigueRow}>
                          <View style={styles.fatigueTrack}><View style={[styles.fatigueFill, { width: `${p.fatigue}%`, backgroundColor: fatigueColor(p.fatigue) }]} /></View>
                          <Text style={[styles.fatigueText, { color: fatigueColor(p.fatigue) }]}>{p.fatigue >= 60 ? 'Tired' : p.fatigue >= 30 ? 'A bit tired' : 'Fresh'}</Text>
                        </View>
                      </View>
                      <Text style={[styles.form, { color: formColor(p.form) }]}>{p.form > 0 ? '▲' : p.form < 0 ? '▼' : '•'} {formText(p.form)}</Text>
                    </Pressable>
                  );
                })}

                {!season.over && season.canPlayToday && (
                  <>
                    <Text style={[fonts.title, { marginTop: spacing.sm }]}>Game plan</Text>
                    {PLANS.map((pl) => (
                      <Pressable key={pl.key} onPress={() => setPlan(pl.key)} style={[styles.plan, plan === pl.key && styles.playerOn]} accessibilityRole="radio" accessibilityState={{ selected: plan === pl.key }}>
                        <Ionicons name={plan === pl.key ? 'radio-button-on' : 'radio-button-off'} size={20} color={plan === pl.key ? colors.brandSky : colors.textSubtle} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.playerName}>{pl.label}</Text>
                          <Text style={fonts.small}>{pl.detail}</Text>
                        </View>
                      </Pressable>
                    ))}
                    {problem && <Text style={[fonts.small, { color: colors.gold }]}>{problem}</Text>}
                    <Pressable onPress={play} disabled={!!problem || busy} style={[styles.goldBtn, !!problem && { opacity: 0.4 }]} accessibilityRole="button">
                      {busy ? <ActivityIndicator color={colors.background} /> : <Text style={styles.goldBtnText}>Play match {season.match}</Text>}
                    </Pressable>
                  </>
                )}
              </>
            )}

            {/* ── League table ── */}
            {tab === 'table' && (
              <View style={styles.card}>
                <View style={styles.tableRow}>
                  <Text style={[styles.th, { flex: 1 }]}>Club</Text>
                  <Text style={styles.th}>P</Text><Text style={styles.th}>W</Text><Text style={styles.th}>Pts</Text>
                </View>
                {season.table.map((r, i) => (
                  <View key={r.name} style={[styles.tableRow, r.you && { backgroundColor: colors.brandPrimaryDim, borderRadius: radius.sm }]}>
                    <Text style={[styles.td, { flex: 1, color: r.you ? colors.white : colors.text, fontWeight: r.you ? '700' : '400' }]}>{i + 1}. {r.name}</Text>
                    <Text style={styles.td}>{r.played}</Text><Text style={styles.td}>{r.won}</Text>
                    <Text style={[styles.td, { fontWeight: '700', color: colors.white }]}>{r.points}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ── Results so far ── */}
            {tab === 'results' && (
              season.reports.length === 0 ? (
                <Text style={fonts.small}>No matches played yet.</Text>
              ) : (
                [...season.reports].reverse().map((m) => (
                  <View key={m.match} style={styles.card}>
                    <View style={styles.pickRow}>
                      <Text style={fonts.title}>Match {m.match} v {m.opponent}</Text>
                      <Text style={{ color: m.won ? colors.success : m.tied ? colors.gold : colors.danger, fontWeight: '800' }}>{m.won ? 'Won' : m.tied ? 'Tied' : 'Lost'}</Text>
                    </View>
                    <Text style={fonts.regular}>You {m.yourScore} · They {m.theirScore}</Text>
                    <Text style={fonts.small}>{m.topBatter.name} {m.topBatter.runs} · {m.topBowler.name} {m.topBowler.wickets} wkts</Text>
                  </View>
                ))
              )
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border as string, padding: spacing.lg },
  h1: { color: colors.white, fontSize: 22, fontWeight: '800' },
  scoreline: { color: colors.white, fontSize: 16, fontWeight: '700', marginVertical: 6 },
  hero: { backgroundColor: '#1D4ED8', borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(96,165,250,0.45)', padding: spacing.xl },
  heroEyebrow: { color: '#BFDBFE', fontSize: 13, fontWeight: '600' },
  heroTitle: { color: colors.white, fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 4 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 4 },
  goldBtn: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: spacing.md },
  goldBtnText: { color: colors.background, fontSize: 15, fontWeight: '800' },
  tabs: { flexDirection: 'row', backgroundColor: colors.surface1, borderRadius: radius.md, padding: 4, gap: 4 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: radius.sm, alignItems: 'center' },
  tabOn: { backgroundColor: colors.brandPrimary },
  tabText: { color: colors.textMuted as string, fontSize: 13, fontWeight: '700' },
  pickRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  link: { color: colors.brandSky, fontSize: 13, fontWeight: '700' },
  player: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border as string, padding: spacing.md },
  playerOn: { borderColor: colors.brandSky, backgroundColor: colors.brandPrimaryDim },
  playerName: { color: colors.white, fontSize: 15, fontWeight: '700' },
  role: { fontSize: 12, fontWeight: '600', marginTop: 1 },
  fatigueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  fatigueTrack: { flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  fatigueFill: { height: 5, borderRadius: 3 },
  fatigueText: { fontSize: 11, fontWeight: '700', width: 72 },
  form: { fontSize: 11, fontWeight: '700', width: 82, textAlign: 'right' },
  plan: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border as string, padding: spacing.md },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6 },
  th: { color: colors.textSubtle as string, fontSize: 11, fontWeight: '700', width: 36, textAlign: 'right' },
  td: { color: colors.text, fontSize: 14, width: 36, textAlign: 'right' },
});

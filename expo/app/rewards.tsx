// Rewards: daily, weekly and monthly goals. Each one is something worth doing anyway (moving,
// turning up, helping the club, playing), each reward is claimed once, and missing a day costs
// nothing. The server decides what is done; this screen only shows it and asks to claim.

import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '../lib/api';
import { colors, fonts, radius, spacing } from '../constants/theme';

type Goal = {
  key: string;
  icon: string;
  title: string;
  detail: string;
  progress: number;
  target: number;
  done: boolean;
  route?: string;
};
type Reward = { id: string; label: string; amount: number; ready: boolean; claimed: boolean };
type PeriodRewards = { title: string; ends: string; goals: Goal[]; rewards: Reward[] };
type Period = 'daily' | 'weekly' | 'monthly';
type Response = {
  unavailable: string | null;
  rewards: Record<Period, PeriodRewards> | null;
  ready: number;
  checkin: { doneToday: boolean };
};

const PERIODS: Period[] = ['daily', 'weekly', 'monthly'];
const ACCENT: Record<Period, string> = { daily: colors.brandSky, weekly: colors.success, monthly: colors.gold };

export default function RewardsScreen() {
  const router = useRouter();
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; good: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<Response>('/api/rewards'));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load your rewards.');
    }
  }, []);

  // Reload whenever the screen comes back into view, so progress made elsewhere shows up
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const claim = async (reward: Reward) => {
    setBusy(reward.id);
    setNotice(null);
    try {
      const res = await api<{ amount: number; capped: boolean }>('/api/rewards/claim', { method: 'POST', body: { id: reward.id } });
      setNotice({
        good: true,
        text: res.capped ? `⭐ ${res.amount} Scores added. Your weekly limit trimmed this one.` : `⭐ ${res.amount} Scores added.`,
      });
    } catch (e) {
      setNotice({ good: false, text: e instanceof ApiError ? e.message : 'Could not claim this reward.' });
    }
    await load();
    setBusy(null);
  };

  const checkIn = async () => {
    setBusy('checkin');
    setNotice(null);
    try {
      const res = await api<{ day: number; amount: number; gotCard: boolean }>('/api/rewards/check-in', { method: 'POST' });
      setNotice({
        good: true,
        text: res.gotCard
          ? `Checked in: day ${res.day}. You earned a free scratch card.`
          : res.amount > 0
            ? `Checked in: day ${res.day}. ⭐ ${res.amount} Scores added.`
            : `Checked in: day ${res.day}.`,
      });
    } catch (e) {
      setNotice({ good: false, text: e instanceof ApiError ? e.message : 'Check-in failed.' });
    }
    await load();
    setBusy(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.gold} />}
      >
        {!data && !error && <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xxl }} />}
        {error && (
          <View style={styles.card}>
            <Text style={fonts.regular}>{error}</Text>
            <Pressable onPress={load} style={styles.outlineBtn}>
              <Text style={styles.outlineBtnText}>Try again</Text>
            </Pressable>
          </View>
        )}
        {data?.unavailable && (
          <View style={styles.card}>
            <Text style={fonts.regular}>{data.unavailable}</Text>
          </View>
        )}
        {notice && (
          <View style={[styles.notice, { borderColor: notice.good ? colors.goldBorder : colors.danger }]}>
            <Text style={[fonts.regular, !notice.good && { color: colors.danger }]}>{notice.text}</Text>
          </View>
        )}

        {data?.rewards &&
          PERIODS.map((period) => {
            const section = data.rewards![period];
            const accent = ACCENT[period];
            return (
              <View key={period} style={styles.card}>
                <View style={styles.headRow}>
                  <Text style={fonts.title}>{section.title}</Text>
                  <Text style={fonts.small}>{section.ends}</Text>
                </View>

                {section.goals.map((g) => {
                  const isCheckin = period === 'daily' && g.key === 'checkin';
                  const pct = Math.round((g.progress / g.target) * 100);
                  return (
                    <View key={g.key} style={styles.goal}>
                      <Text style={styles.goalIcon}>{g.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <View style={styles.headRow}>
                          <Text style={[styles.goalTitle, g.done && { color: colors.white }]}>{g.title}</Text>
                          {g.done ? (
                            <Ionicons name="checkmark-circle" size={18} color={accent} />
                          ) : g.target > 1 ? (
                            <Text style={fonts.small}>
                              {g.progress.toLocaleString('en-GB')} / {g.target.toLocaleString('en-GB')}
                            </Text>
                          ) : null}
                        </View>
                        {g.target > 1 && (
                          <View style={styles.track}>
                            <View style={[styles.fill, { width: `${pct}%`, backgroundColor: accent }]} />
                          </View>
                        )}
                        {!g.done && <Text style={[fonts.small, { marginTop: 4 }]}>{g.detail}</Text>}
                        {!g.done && isCheckin && (
                          <Pressable onPress={checkIn} disabled={busy !== null} style={[styles.smallBtn, { backgroundColor: accent }]}>
                            {busy === 'checkin' ? <ActivityIndicator color={colors.background} /> : <Text style={styles.smallBtnText}>Check in</Text>}
                          </Pressable>
                        )}
                        {!g.done && g.route && (
                          <Pressable onPress={() => router.push(g.route as never)} style={styles.linkBtn}>
                            <Text style={[styles.linkBtnText, { color: accent }]}>Go there</Text>
                            <Ionicons name="chevron-forward" size={13} color={accent} />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                })}

                <View style={styles.divider} />
                {section.rewards.map((r) => (
                  <View key={r.id} style={styles.rewardRow}>
                    <Text style={[fonts.small, { flex: 1 }, r.ready && !r.claimed && { color: colors.text }]} numberOfLines={1}>
                      {r.label}
                    </Text>
                    {r.claimed ? (
                      <Text style={styles.claimed}>Claimed ⭐ {r.amount}</Text>
                    ) : r.ready && r.amount > 0 ? (
                      <Pressable onPress={() => claim(r)} disabled={busy !== null} style={styles.claimBtn}>
                        {busy === r.id ? <ActivityIndicator color={colors.background} /> : <Text style={styles.claimBtnText}>Claim ⭐ {r.amount}</Text>}
                      </Pressable>
                    ) : (
                      <Text style={styles.locked}>⭐ {r.amount}</Text>
                    )}
                  </View>
                ))}
              </View>
            );
          })}

        {data?.rewards && (
          <Text style={[fonts.small, { textAlign: 'center' }]}>
            Miss a day and nothing is lost. Weekly and monthly goals leave room for rest days.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.navyBorder,
    padding: spacing.lg,
  },
  notice: { backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, padding: spacing.md },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },

  goal: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, alignItems: 'flex-start' },
  goalIcon: { fontSize: 22, width: 28, textAlign: 'center' },
  goalTitle: { color: colors.text, fontSize: 15, fontWeight: '600', flexShrink: 1 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surface2, marginTop: 8, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },

  smallBtn: { alignSelf: 'flex-start', borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 8, marginTop: spacing.sm },
  smallBtnText: { color: colors.background, fontSize: 14, fontWeight: '800' },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 6, alignSelf: 'flex-start' },
  linkBtnText: { fontSize: 13, fontWeight: '700' },

  divider: { height: 1, backgroundColor: colors.border, marginTop: spacing.lg, marginBottom: spacing.xs },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 40, marginTop: 4 },
  claimBtn: { backgroundColor: colors.gold, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 8, minWidth: 96, alignItems: 'center' },
  claimBtnText: { color: colors.background, fontSize: 14, fontWeight: '800' },
  claimed: { color: colors.success, fontSize: 13, fontWeight: '700' },
  locked: { color: colors.textSubtle, fontSize: 13, fontWeight: '700' },

  outlineBtn: {
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.navyBorder, paddingVertical: 12, alignItems: 'center', marginTop: spacing.md,
  },
  outlineBtnText: { color: colors.brandSky, fontSize: 15, fontWeight: '700' },
});

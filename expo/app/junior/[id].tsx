import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radius, spacing } from '../../constants/theme';

type JuniorProfile = {
  full_name: string;
  age_group: string | null;
  consent_given: boolean;
  consent_date: string | null;
  date_of_birth: string | null;
};

type JuniorStats = {
  steps_today: number;
  steps_goal: number;
  scores_balance: number;
  lifetime_scores: number;
  streak_day: number;
  upcoming_sessions: number;
};

export default function JuniorDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [junior, setJunior] = useState<JuniorProfile | null>(null);
  const [stats, setStats] = useState<JuniorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user || !id) return;
    try {
      // Load junior profile from linked_juniors (parent can only see their linked children)
      const { data: link } = await supabase
        .from('linked_juniors')
        .select('full_name, age_group, consent_given, consent_date, date_of_birth')
        .eq('parent_id', user.id)
        .eq('junior_id', id)
        .eq('link_status', 'approved')
        .maybeSingle();

      if (link) {
        setJunior(link);

        // Load junior's wallet / stats
        const { data: wallet } = await supabase
          .from('wallets')
          .select('flexi_balance, reward_balance, lifetime_earned')
          .eq('user_id', id)
          .maybeSingle();

        // Load junior's step data for today
        const today = new Date().toISOString().split('T')[0];
        const { data: stepRow } = await supabase
          .from('daily_steps')
          .select('step_count, streak_day')
          .eq('user_id', id)
          .eq('date', today)
          .maybeSingle();

        // Count upcoming coaching sessions
        const { count: sessionCount } = await supabase
          .from('coaching_bookings')
          .select('id', { count: 'exact', head: true })
          .eq('player_id', id)
          .gte('session_date', new Date().toISOString());

        setStats({
          steps_today: stepRow?.step_count ?? 0,
          steps_goal: 10000,
          scores_balance: (wallet?.flexi_balance ?? 0) + (wallet?.reward_balance ?? 0),
          lifetime_scores: wallet?.lifetime_earned ?? 0,
          streak_day: stepRow?.streak_day ?? 0,
          upcoming_sessions: sessionCount ?? 0,
        });
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const initials = junior?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '?';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: junior?.full_name ?? 'Junior',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.white,
        }}
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandSky} /></View>
      ) : !junior ? (
        <View style={styles.center}>
          <Text style={fonts.title}>Not found</Text>
          <Text style={fonts.small}>This junior is not linked to your account.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandSky} />}
        >
          {/* Read-only banner */}
          <View style={styles.banner}>
            <Text style={styles.bannerText}>👁️ Viewing as parent · Read-only</Text>
          </View>

          {/* Junior header */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={fonts.title}>{junior.full_name}</Text>
            {junior.age_group && <Text style={fonts.small}>{junior.age_group}</Text>}
            <View style={[styles.statusPill, junior.consent_given ? styles.greenPill : styles.orangePill]}>
              <Text style={[styles.statusText, { color: junior.consent_given ? colors.success : colors.orange }]}>
                {junior.consent_given ? '✓ Consent active' : '⏳ Consent pending'}
              </Text>
            </View>
          </View>

          {stats && (
            <>
              {/* Steps */}
              <Text style={styles.sectionLabel}>ACTIVITY</Text>
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={[styles.cardIcon, { backgroundColor: 'rgba(96,165,250,0.12)' }]}>
                    <Text style={{ fontSize: 16 }}>🏃</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={fonts.title}>{stats.steps_today.toLocaleString('en-GB')} steps</Text>
                    <Text style={fonts.small}>{Math.round((stats.steps_today / stats.steps_goal) * 100)}% of daily goal</Text>
                  </View>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.min(100, (stats.steps_today / stats.steps_goal) * 100)}%` }]} />
                </View>
              </View>

              {/* Streak */}
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={[styles.cardIcon, { backgroundColor: colors.orangeDim }]}>
                    <Text style={{ fontSize: 16 }}>🔥</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={fonts.title}>{stats.streak_day} day streak</Text>
                    <Text style={fonts.small}>Consecutive active days</Text>
                  </View>
                </View>
              </View>

              {/* Scores / Wallet */}
              <Text style={styles.sectionLabel}>SCORES & WALLET</Text>
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={[styles.cardIcon, { backgroundColor: colors.goldDim as string }]}>
                    <Text style={{ fontSize: 16 }}>⭐</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[fonts.title, { color: colors.gold }]}>
                      {stats.scores_balance.toLocaleString('en-GB')} Scores
                    </Text>
                    <Text style={fonts.small}>Lifetime: {stats.lifetime_scores.toLocaleString('en-GB')}</Text>
                  </View>
                </View>
              </View>

              {/* Coaching sessions */}
              <Text style={styles.sectionLabel}>COACHING</Text>
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={[styles.cardIcon, { backgroundColor: colors.successDim }]}>
                    <Text style={{ fontSize: 16 }}>🏏</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={fonts.title}>
                      {stats.upcoming_sessions} upcoming session{stats.upcoming_sessions !== 1 ? 's' : ''}
                    </Text>
                    <Text style={fonts.small}>Booked coaching sessions</Text>
                  </View>
                </View>
              </View>

              {/* Sporting Soul placeholder */}
              <Text style={styles.sectionLabel}>SPORTING SOUL</Text>
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={[styles.cardIcon, { backgroundColor: 'rgba(96,165,250,0.12)' }]}>
                    <Text style={{ fontSize: 16 }}>📖</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={fonts.title}>Personality profile</Text>
                    <Text style={fonts.small}>View your child's Sporting Soul AI profile</Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  content: { padding: spacing.lg, gap: spacing.md },

  banner: {
    backgroundColor: 'rgba(249,115,22,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.25)',
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  bannerText: { color: colors.orange, fontSize: 13, fontWeight: '600' },

  profileCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border as string,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(96,165,250,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  avatarText: { color: colors.brandSky, fontSize: 20, fontWeight: '700' },

  statusPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill, marginTop: spacing.xs },
  greenPill: { backgroundColor: colors.successDim },
  orangePill: { backgroundColor: colors.orangeDim },
  statusText: { fontSize: 12, fontWeight: '600' },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(232,237,245,0.4)',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },

  card: {
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border as string,
    padding: spacing.md,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.brandSky, borderRadius: 2 },
});

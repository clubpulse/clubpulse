import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Card } from '../../components/Card';
import { UpsellBanner } from '../../components/UpsellBanner';
import { useAuth } from '../../hooks/useAuth';
import { useRoles } from '../../hooks/useRoles';
import { api } from '../../lib/api';
import { colors, fonts, radius, spacing } from '../../constants/theme';

type Coach = {
  id: string;
  full_name: string;
  bio: string | null;
  ecb_level: number | null;
  dbs_verified: boolean;
  hourly_rate: number | null;
  specialisations: string[];
  rating: number | null;
  sessions_count: number;
};

export default function CoachesScreen() {
  const { user } = useAuth();
  const { isCoach } = useRoles();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<Coach[]>('/api/coaches');
      setCoaches(data ?? []);
      setError(null);
    } catch {
      setError('Could not load coaches. Pull down to try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}><ActivityIndicator color={colors.brandSky} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={coaches}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandSky} />}
        ListHeaderComponent={
          <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
            <Text style={fonts.heading}>Coaches</Text>
            <Text style={fonts.small}>Coaches approved by your club.</Text>
            {error && <Text style={{ color: colors.danger }}>{error}. Pull down to try again.</Text>}

            {/* Show own coaching profile if user is a coach */}
            {isCoach && user && (
              <View style={[styles.card, { borderColor: 'rgba(34,197,94,0.25)', marginTop: spacing.sm }]}>
                <View style={styles.row}>
                  <View style={[styles.avatar, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
                    <Text style={[styles.avatarText, { color: colors.success }]}>
                      {(user.user_metadata?.full_name ?? 'You').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={fonts.title}>{user.user_metadata?.full_name ?? 'You'}</Text>
                    <View style={styles.badgeRow}>
                      <View style={[styles.badge, { backgroundColor: colors.successDim }]}>
                        <Text style={[styles.badgeText, { color: colors.success }]}>Your profile</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}

            <UpsellBanner trigger="coach_ai_tease" compact />
            <Text style={[fonts.title, { marginTop: spacing.md }]}>Available coaches</Text>
          </View>
        }
        ListEmptyComponent={
          <Card>
            <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.md }}>
              <Text style={{ fontSize: 36 }}>🏏</Text>
              <Text style={fonts.title}>No coaches yet</Text>
              <Text style={[fonts.small, { textAlign: 'center' }]}>
                Coaches appear here once your club has approved them.
              </Text>
            </View>
          </Card>
        }
        renderItem={({ item }) => <CoachCard coach={item} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />
    </SafeAreaView>
  );
}

function CoachCard({ coach }: { coach: Coach }) {
  const ecbLabel = coach.ecb_level != null ? `ECB Level ${coach.ecb_level}` : null;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/coach/[id]', params: { id: coach.id } })}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      {/* Avatar + Name row */}
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {coach.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={fonts.title} numberOfLines={1}>{coach.full_name}</Text>
          <View style={styles.badgeRow}>
            {ecbLabel && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{ecbLabel}</Text>
              </View>
            )}
            {coach.dbs_verified && (
              <View style={[styles.badge, { backgroundColor: colors.successDim }]}>
                <Text style={[styles.badgeText, { color: colors.success }]}>✓ DBS</Text>
              </View>
            )}
          </View>
        </View>
        {coach.hourly_rate != null && (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[fonts.regular, { color: colors.gold, fontWeight: '700' }]}>
              {coach.hourly_rate}
            </Text>
            <Text style={fonts.small}>Scores an hour</Text>
          </View>
        )}
      </View>

      {/* Bio */}
      {coach.bio && (
        <Text style={[fonts.small, { marginTop: spacing.sm }]} numberOfLines={2}>
          {coach.bio}
        </Text>
      )}

      {/* Specialisations */}
      {coach.specialisations.length > 0 && (
        <View style={[styles.badgeRow, { marginTop: spacing.sm }]}>
          {coach.specialisations.slice(0, 3).map((s) => (
            <View key={s} style={[styles.badge, { backgroundColor: 'rgba(37,99,235,0.12)' }]}>
              <Text style={[styles.badgeText, { color: colors.brandSky }]}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Stats row */}
      <View style={[styles.row, { marginTop: spacing.sm, gap: spacing.lg }]}>
        {coach.rating != null && (
          <Text style={fonts.small}>⭐ {coach.rating.toFixed(1)}</Text>
        )}
        <Text style={fonts.small}>{coach.sessions_count} sessions</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg },
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border as string,
    padding: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(37,99,235,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.brandSky, fontSize: 16, fontWeight: '700' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(96,165,250,0.12)',
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.brandSky },
  successDim: { backgroundColor: 'rgba(34,197,94,0.12)' },
});

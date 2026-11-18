import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import { useAuth } from '../../hooks/useAuth';
import { useRoles } from '../../hooks/useRoles';
import { api, ApiError } from '../../lib/api';
import { colors, fonts, radius, spacing } from '../../constants/theme';

type Shift = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  scores_reward: number;
  spots_total: number;
  spots_filled: number;
  signed_up: boolean;
};

type Tab = 'available' | 'my';

export default function ShiftsScreen() {
  const { user } = useAuth();
  const { isAdmin } = useRoles();
  const [tab, setTab] = useState<Tab>('available');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<Shift[]>(`/api/shifts?tab=${tab}`);
      setShifts(data ?? []);
      setError(null);
    } catch {
      setShifts([]);
      setError('Could not load shifts. Pull down to try again.');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { setLoading(true); load(); }, [load]);
  // Coming back from posting a shift, or from another tab, shows the latest list
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const router = useRouter();

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const signUp = async (shiftId: string) => {
    setBusyId(shiftId);
    try {
      await api('/api/shifts/sign-up', { method: 'POST', body: { shiftId } });
      await load();
    } catch (e) {
      // The server says why, e.g. the shift filled up while the list was open
      Alert.alert('Not signed up', e instanceof ApiError ? e.message : 'Could not sign up for this shift.');
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (shiftId: string) => {
    setBusyId(shiftId);
    try {
      await api('/api/shifts/cancel', { method: 'POST', body: { shiftId } });
      await load();
    } catch (e) {
      Alert.alert('Not cancelled', e instanceof ApiError ? e.message : 'Could not cancel this shift.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={shifts}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandSky} />}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
            <Text style={fonts.heading}>Volunteer Shifts</Text>

            {isAdmin && (
              <Pressable onPress={() => router.push('/post-shift')} accessibilityRole="button"
                style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start' }, pressed && { opacity: 0.7 }]}>
                <Ionicons name="add-circle" size={18} color={colors.success} />
                <Text style={{ color: colors.success, fontWeight: '700' }}>Post a shift</Text>
              </Pressable>
            )}

            {/* Tab selector */}
            <View style={styles.tabBar}>
              <Pressable
                style={[styles.tabBtn, tab === 'available' && styles.tabActive]}
                onPress={() => setTab('available')}
              >
                <Text style={[styles.tabText, tab === 'available' && styles.tabTextActive]}>Available</Text>
              </Pressable>
              <Pressable
                style={[styles.tabBtn, tab === 'my' && styles.tabActive]}
                onPress={() => setTab('my')}
              >
                <Text style={[styles.tabText, tab === 'my' && styles.tabTextActive]}>My Shifts</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}><ActivityIndicator color={colors.brandSky} /></View>
          ) : (
            <Card>
              <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.md }}>
                <Text style={{ fontSize: 36 }}>📋</Text>
                <Text style={fonts.title}>
                  {tab === 'available' ? 'No Shifts Available' : 'No Upcoming Shifts'}
                </Text>
                <Text style={[fonts.small, { textAlign: 'center' }]}>
                  {error ??
                    (tab === 'available'
                      ? 'Check back later — your club admin will post shifts here.'
                      : "You haven't signed up for any shifts yet.")}
                </Text>
              </View>
            </Card>
          )
        }
        renderItem={({ item }) => (
          <ShiftCard
            shift={item}
            tab={tab}
            busy={busyId === item.id}
            onSignUp={() => signUp(item.id)}
            onCancel={() => cancel(item.id)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />
    </SafeAreaView>
  );
}

function ShiftCard({
  shift,
  tab,
  busy,
  onSignUp,
  onCancel,
}: {
  shift: Shift;
  tab: Tab;
  busy: boolean;
  onSignUp: () => void;
  onCancel: () => void;
}) {
  const start = new Date(shift.start_time);
  const end = new Date(shift.end_time);
  const dateStr = start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeStr = `${start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  const spotsFree = shift.spots_total - shift.spots_filled;
  const full = spotsFree <= 0 && !shift.signed_up;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.row}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={fonts.title} numberOfLines={1}>{shift.title}</Text>
          <Text style={fonts.small}>{dateStr}  ·  {timeStr}</Text>
          {shift.location && <Text style={fonts.small}>📍 {shift.location}</Text>}
        </View>

        {/* Scores reward badge */}
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>+{shift.scores_reward}</Text>
          <Text style={[fonts.small, { color: colors.gold, fontSize: 10 }]}>Scores</Text>
        </View>
      </View>

      {shift.description && (
        <Text style={[fonts.small, { marginTop: spacing.sm }]} numberOfLines={2}>
          {shift.description}
        </Text>
      )}

      {/* Footer */}
      <View style={[styles.row, { marginTop: spacing.md }]}>
        <Text style={[fonts.small, full ? { color: colors.danger } : {}]}>
          {full ? 'Full' : `${spotsFree} spot${spotsFree !== 1 ? 's' : ''} left`}
        </Text>
        <View style={{ flex: 1 }} />

        {tab === 'available' && !shift.signed_up && !full && (
          <Pressable style={styles.btn} onPress={onSignUp} disabled={busy}>
            {busy ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.btnText}>Sign Up</Text>
            )}
          </Pressable>
        )}

        {shift.signed_up && (
          <Pressable style={[styles.btn, styles.btnOutline]} onPress={onCancel} disabled={busy}>
            {busy ? (
              <ActivityIndicator size="small" color={colors.brandSky} />
            ) : (
              <Text style={[styles.btnText, { color: colors.brandSky }]}>Cancel</Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  content: { padding: spacing.lg },
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border as string,
    padding: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  scoreBadge: {
    alignItems: 'center',
    backgroundColor: colors.goldDim as string,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.goldBorder as string,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scoreText: { color: colors.gold, fontWeight: '800', fontSize: 16 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  tabActive: { backgroundColor: colors.brandPrimary },
  tabText: { color: colors.textMuted as string, fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: '#fff' },
  btn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.brandSky,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  adminBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border as string,
    paddingVertical: spacing.sm,
  },
});

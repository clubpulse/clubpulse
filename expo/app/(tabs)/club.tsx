import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radius, spacing } from '../../constants/theme';

type ClubSummary = {
  id: string;
  name: string;
  member_count: number;
  subscription_tier: string | null;
};

type MemberRow = {
  id: string;
  full_name: string;
  user_role: string;
  created_at: string;
};

export default function ClubScreen() {
  const { user } = useAuth();
  const [club, setClub] = useState<ClubSummary | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      // Find the club this user belongs to
      const { data: membership } = await supabase
        .from('club_members')
        .select('club_id, user_role, clubs ( id, name, subscription_tier )')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (!membership?.clubs) {
        setClub(null);
        setLoading(false);
        return;
      }

      const clubData = Array.isArray(membership.clubs) ? membership.clubs[0] : membership.clubs;

      // Count members
      const { count } = await supabase
        .from('club_members')
        .select('id', { count: 'exact', head: true })
        .eq('club_id', clubData.id);

      setClub({
        id: clubData.id,
        name: clubData.name,
        member_count: count ?? 0,
        subscription_tier: clubData.subscription_tier,
      });

      // Get member list
      const { data: memberRows } = await supabase
        .from('club_members')
        .select('id, user_role, created_at, profiles ( full_name )')
        .eq('club_id', clubData.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setMembers(
        (memberRows ?? []).map((m: any) => ({
          id: m.id,
          full_name: (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles)?.full_name ?? 'Unknown',
          user_role: m.user_role ?? 'player',
          created_at: m.created_at,
        }))
      );
      setError(null);
    } catch {
      setError('Could not load your club');
    } finally {
      setLoading(false);
    }
  }, [user]);

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

  if (!club) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={[styles.center, { padding: spacing.xl }]}>
          <Text style={fonts.heading}>No Club Yet</Text>
          <Text style={[fonts.small, { textAlign: 'center', marginTop: spacing.sm }]}>
            You're not a member of a club yet. Ask your club admin to invite you, or create a club on clubpulse.co.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const tierColor = club.subscription_tier === 'elite' ? colors.gold
    : club.subscription_tier === 'pro' ? colors.success
    : colors.brandSky;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={members}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandSky} />}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg, marginBottom: spacing.md }}>
            <Text style={fonts.heading}>{club.name}</Text>

            {/* Club stats */}
            <Card>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.brandSky }]}>{club.member_count}</Text>
                  <Text style={fonts.small}>Members</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: tierColor }]}>
                    {(club.subscription_tier ?? 'none').charAt(0).toUpperCase() + (club.subscription_tier ?? 'none').slice(1)}
                  </Text>
                  <Text style={fonts.small}>Plan</Text>
                </View>
              </View>
            </Card>

            {error && <Text style={{ color: colors.danger }}>{error}</Text>}

            <Text style={fonts.title}>Members</Text>
          </View>
        }
        ListEmptyComponent={<Text style={fonts.small}>No members found.</Text>}
        renderItem={({ item }) => (
          <View style={styles.memberRow}>
            <View style={[styles.avatar, { backgroundColor: roleColor(item.user_role) + '22' }]}>
              <Text style={[styles.avatarText, { color: roleColor(item.user_role) }]}>
                {item.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={fonts.regular} numberOfLines={1}>{item.full_name}</Text>
              <Text style={fonts.small}>{item.user_role}</Text>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </SafeAreaView>
  );
}

function roleColor(role: string): string {
  switch (role) {
    case 'club_admin': return colors.brandSky;
    case 'coach': return colors.success;
    case 'volunteer': return colors.gold;
    case 'parent': return colors.orange;
    default: return colors.text;
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xs },
  statValue: { fontSize: 28, fontWeight: '800' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border as string,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700' },
});

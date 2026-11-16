import { useCallback, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import { useRoles } from '../../hooks/useRoles';
import { api } from '../../lib/api';
import { ROLE_CONFIG } from '../../lib/roles';
import type { ApprovalRequest } from '../../lib/roles';
import { colors, fonts, radius, spacing } from '../../constants/theme';

type Tab = 'overview' | 'approvals' | 'members';

export default function ClubScreen() {
  const { club, isAdmin, approvalQueue, loading, refresh } = useRoles();
  const [tab, setTab] = useState<Tab>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
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

  const handleApproval = async (requestId: string, action: 'approve' | 'reject') => {
    setBusyId(requestId);
    try {
      await api(`/api/approvals/${requestId}`, { method: 'POST', body: { action } });
      await refresh();
    } catch {
      Alert.alert('Error', `Could not ${action} this request.`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={tab === 'approvals' ? approvalQueue : []}
        keyExtractor={(item) => item.id}
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
                    {(club.subscription_tier ?? 'None').charAt(0).toUpperCase() + (club.subscription_tier ?? 'none').slice(1)}
                  </Text>
                  <Text style={fonts.small}>Plan</Text>
                </View>
              </View>
            </Card>

            {/* Admin tabs */}
            {isAdmin && (
              <View style={styles.tabBar}>
                {(['overview', 'approvals', 'members'] as Tab[]).map((t) => (
                  <Pressable
                    key={t}
                    style={[styles.tabBtn, tab === t && styles.tabActive]}
                    onPress={() => setTab(t)}
                  >
                    <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                      {t === 'approvals' ? `Approvals${approvalQueue.length > 0 ? ` (${approvalQueue.length})` : ''}` : t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Overview tab content */}
            {tab === 'overview' && isAdmin && (
              <View style={{ gap: spacing.md }}>
                <Text style={fonts.title}>Admin Quick Actions</Text>
                <View style={styles.quickRow}>
                  <Pressable style={styles.quickCard}>
                    <Ionicons name="person-add" size={18} color={colors.brandSky} />
                    <Text style={[styles.quickText, { color: colors.brandSky }]}>Invite</Text>
                  </Pressable>
                  <Pressable style={styles.quickCard}>
                    <Ionicons name="cash" size={18} color={colors.gold} />
                    <Text style={[styles.quickText, { color: colors.gold }]}>Buy Scores</Text>
                  </Pressable>
                  <Pressable style={styles.quickCard}>
                    <Ionicons name="add-circle" size={18} color={colors.success} />
                    <Text style={[styles.quickText, { color: colors.success }]}>Post Shift</Text>
                  </Pressable>
                </View>

                {approvalQueue.length > 0 && (
                  <Pressable style={styles.alertCard} onPress={() => setTab('approvals')}>
                    <Ionicons name="alert-circle" size={20} color={colors.orange} />
                    <Text style={[fonts.regular, { flex: 1 }]}>
                      {approvalQueue.length} pending approval{approvalQueue.length !== 1 ? 's' : ''}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
                  </Pressable>
                )}
              </View>
            )}

            {tab === 'approvals' && (
              <Text style={fonts.title}>
                {approvalQueue.length === 0 ? 'No Pending Requests' : 'Pending Requests'}
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          tab === 'approvals' ? (
            <Card>
              <View style={{ alignItems: 'center', padding: spacing.md, gap: spacing.sm }}>
                <Text style={{ fontSize: 32 }}>✅</Text>
                <Text style={fonts.regular}>All caught up!</Text>
                <Text style={[fonts.small, { textAlign: 'center' }]}>
                  No pending approval requests right now.
                </Text>
              </View>
            </Card>
          ) : null
        }
        renderItem={({ item }) => (
          <ApprovalCard
            request={item}
            busy={busyId === item.id}
            onApprove={() => handleApproval(item.id, 'approve')}
            onReject={() => handleApproval(item.id, 'reject')}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </SafeAreaView>
  );
}

// ── Approval card ────────────────────────────────────────────────────────────

function ApprovalCard({
  request,
  busy,
  onApprove,
  onReject,
}: {
  request: ApprovalRequest;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const typeLabels: Record<string, { label: string; icon: string; color: string }> = {
    join_club: { label: 'Join club', icon: 'person-add', color: colors.brandSky },
    role_request: { label: 'Role request', icon: 'key', color: colors.brandSky },
    parent_role: { label: 'Parent role', icon: 'people', color: colors.orange },
    link_junior: { label: 'Link junior', icon: 'shield-checkmark', color: colors.orange },
    coach_verification: { label: 'Coach verification', icon: 'trophy', color: colors.success },
    volunteer_request: { label: 'Volunteer request', icon: 'heart', color: colors.gold },
  };
  const config = typeLabels[request.type] ?? { label: request.type, icon: 'help-circle', color: colors.text };

  return (
    <View style={styles.approvalCard}>
      <View style={styles.approvalRow}>
        <Ionicons name={config.icon as any} size={20} color={config.color} />
        <View style={{ flex: 1 }}>
          <Text style={fonts.title}>{request.requester_name}</Text>
          <Text style={fonts.small}>{config.label} · {request.details}</Text>
          <Text style={[fonts.small, { fontSize: 11, marginTop: 2 }]}>
            {new Date(request.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </Text>
        </View>
      </View>
      <View style={styles.approvalActions}>
        <Pressable
          style={[styles.actionBtn, styles.rejectBtn]}
          onPress={onReject}
          disabled={busy}
        >
          {busy ? <ActivityIndicator size="small" color={colors.danger} /> : (
            <Text style={[styles.actionBtnText, { color: colors.danger }]}>Reject</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.actionBtn, styles.approveBtn]}
          onPress={onApprove}
          disabled={busy}
        >
          {busy ? <ActivityIndicator size="small" color="#fff" /> : (
            <Text style={[styles.actionBtnText, { color: '#fff' }]}>Approve</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

function roleColor(role: string): string {
  return ROLE_CONFIG[role as keyof typeof ROLE_CONFIG]?.color ?? colors.text;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg },

  statsRow: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xs },
  statValue: { fontSize: 28, fontWeight: '800' },

  tabBar: { flexDirection: 'row', backgroundColor: colors.surface1, borderRadius: radius.md, padding: 3 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.brandPrimary },
  tabText: { color: colors.textMuted as string, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#fff' },

  quickRow: { flexDirection: 'row', gap: spacing.sm },
  quickCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border as string,
  },
  quickText: { fontSize: 11, fontWeight: '600' },

  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.orangeDim,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.25)',
    borderRadius: radius.md,
    padding: spacing.md,
  },

  approvalCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border as string,
    padding: spacing.md,
    gap: spacing.md,
  },
  approvalRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  approvalActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  rejectBtn: {
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.25)',
  },
  approveBtn: { backgroundColor: colors.success },
  actionBtnText: { fontWeight: '700', fontSize: 14 },
});

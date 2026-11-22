import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import { useRoles } from '../../hooks/useRoles';
import { api, ApiError } from '../../lib/api';
import { ROLE_CONFIG } from '../../lib/roles';
import type { ApprovalRequest } from '../../lib/roles';
import { colors, display, fonts, radius, spacing } from '../../constants/theme';
import { BackBar } from '../../components/BackBar';

type Tab = 'overview' | 'approvals' | 'members';
type Member = { id: string; role: string; is_active: boolean; joined_at: string; full_name: string | null; display_name: string | null };
type Invite = { clubName: string; code: string };
type JoinState = { state: 'none' } | { state: 'pending' | 'member'; clubName: string };

export default function ClubScreen() {
  const { club, isAdmin, isPlayer, approvalQueue, loading, refresh } = useRoles();
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [addPlayerError, setAddPlayerError] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const clubId = club?.id;

  // For an admin who also plays: holding the Player role puts the player side next to the club side
  async function addPlayerSide() {
    if (addingPlayer) return;
    setAddingPlayer(true);
    setAddPlayerError(false);
    try {
      await api('/api/profile/roles', { method: 'POST', body: { role: 'player' } });
      await refresh();
    } catch {
      setAddPlayerError(true);
    } finally {
      setAddingPlayer(false);
    }
  }

  const loadMembers = useCallback(async () => {
    if (!clubId || !isAdmin) return;
    setMembersError(null);
    try {
      const data = await api<{ members: Member[] }>(`/api/admin/members?clubId=${encodeURIComponent(clubId)}`);
      setMembers(data.members);
    } catch (e) {
      setMembersError(e instanceof ApiError ? e.message : 'Could not load members.');
    }
  }, [clubId, isAdmin]);

  useEffect(() => {
    if (tab === 'members') loadMembers();
  }, [tab, loadMembers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refresh(), tab === 'members' ? loadMembers() : Promise.resolve()]);
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <BackBar />
        <View style={styles.center}><ActivityIndicator color={colors.brandSky} /></View>
      </SafeAreaView>
    );
  }

  if (!club) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <BackBar />
        <JoinClub onJoined={refresh} />
      </SafeAreaView>
    );
  }

  const tierColor = club.subscription_tier === 'elite' ? colors.gold
    : club.subscription_tier === 'pro' ? colors.success
    : colors.brandSky;

  const handleApproval = async (requestId: string, action: 'approve' | 'reject') => {
    setBusyId(requestId);
    try {
      await api(`/api/approvals/${encodeURIComponent(requestId)}`, { method: 'POST', body: { action } });
      await refresh();
      if (tab === 'members' || members) loadMembers();
    } catch (e) {
      Alert.alert('Not done', e instanceof ApiError ? e.message : `Could not ${action} this request.`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BackBar />
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
                <Text style={fonts.title}>Admin quick actions</Text>
                <View style={styles.quickRow}>
                  <Pressable style={({ pressed }) => [styles.quickCard, pressed && { opacity: 0.7 }]} onPress={() => setInviteOpen(true)}
                    accessibilityRole="button" accessibilityLabel="Invite members">
                    <Ionicons name="person-add" size={18} color={colors.brandSky} />
                    <Text style={[styles.quickText, { color: colors.brandSky }]}>Invite</Text>
                  </Pressable>
                  <Pressable style={({ pressed }) => [styles.quickCard, pressed && { opacity: 0.7 }]} onPress={() => router.push('/post-shift')}
                    accessibilityRole="button" accessibilityLabel="Post a volunteer shift">
                    <Ionicons name="add-circle" size={18} color={colors.success} />
                    <Text style={[styles.quickText, { color: colors.success }]}>Post a shift</Text>
                  </Pressable>
                  <Pressable style={({ pressed }) => [styles.quickCard, pressed && { opacity: 0.7 }]} onPress={() => setTab('members')}
                    accessibilityRole="button" accessibilityLabel="See members">
                    <Ionicons name="people" size={18} color={colors.gold} />
                    <Text style={[styles.quickText, { color: colors.gold }]}>Members</Text>
                  </Pressable>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.alertCard, { backgroundColor: colors.surface1 }, pressed && { opacity: 0.7 }]}
                  onPress={() => router.push('/web?path=%2Fadmin%2Fclub&title=Club%20admin')}
                  accessibilityRole="button" accessibilityLabel="Open every club admin tool"
                >
                  <Ionicons name="shield-checkmark" size={20} color="#F87171" />
                  <View style={{ flex: 1 }}>
                    <Text style={fonts.regular}>All club tools</Text>
                    <Text style={[fonts.small, { fontSize: 11 }]}>Availability, finance, safeguarding, Scores rules and more</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
                </Pressable>

                {!isPlayer && (
                  <Pressable
                    style={({ pressed }) => [styles.alertCard, { backgroundColor: colors.surface1 }, pressed && { opacity: 0.7 }]}
                    onPress={addPlayerSide} disabled={addingPlayer}
                    accessibilityRole="button" accessibilityLabel="Add the player side"
                  >
                    <Ionicons name="person-add" size={20} color={colors.brandSky} />
                    <View style={{ flex: 1 }}>
                      <Text style={fonts.regular}>{addingPlayer ? 'Adding…' : 'Do you play for the club too?'}</Text>
                      <Text style={[fonts.small, { fontSize: 11 }]}>
                        {addPlayerError ? 'That did not work. Tap to try again.' : 'Add the player side: Scores, technique, Warm-Up and the rest.'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
                  </Pressable>
                )}

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
                {approvalQueue.length === 0 ? 'No pending requests' : 'Pending requests'}
              </Text>
            )}

            {tab === 'members' && isAdmin && (
              <View style={{ gap: spacing.sm }}>
                <Text style={fonts.title}>Members{members ? ` (${members.filter((m) => m.is_active).length})` : ''}</Text>
                {!members && !membersError && <ActivityIndicator color={colors.brandSky} style={{ marginTop: spacing.md }} />}
                {!!membersError && (
                  <Pressable onPress={loadMembers} style={styles.alertCard}>
                    <Text style={[fonts.regular, { flex: 1 }]}>{membersError} Tap to try again.</Text>
                  </Pressable>
                )}
                {members?.map((m) => (
                  <View key={m.id} style={[styles.memberRow, !m.is_active && { opacity: 0.5 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={fonts.regular} numberOfLines={1}>{m.full_name || m.display_name || 'Member'}</Text>
                      <Text style={[fonts.small, { fontSize: 11 }]}>
                        Joined {new Date(m.joined_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {m.is_active ? '' : ' · switched off'}
                      </Text>
                    </View>
                    <Text style={[styles.memberRole, { color: roleColor(m.role) }]}>
                      {ROLE_CONFIG[m.role as keyof typeof ROLE_CONFIG]?.label ?? m.role}
                    </Text>
                  </View>
                ))}
                {members && (
                  <Text style={[fonts.small, { fontSize: 11, marginTop: spacing.sm }]}>
                    To change someone&apos;s role or switch a member off, use the club dashboard on the web.
                  </Text>
                )}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          tab === 'approvals' ? (
            <Card>
              <View style={{ alignItems: 'center', padding: spacing.md, gap: spacing.sm }}>
                <Text style={{ fontSize: 32 }}>✅</Text>
                <Text style={fonts.regular}>All caught up</Text>
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
      <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} />
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
      {request.type !== 'join_club' && <Text style={[fonts.small, { fontSize: 11 }]}>To decline, use the club dashboard on the web.</Text>}
      <View style={styles.approvalActions}>
        {request.type === 'join_club' && (
          <Pressable style={[styles.actionBtn, styles.rejectBtn]} onPress={onReject} disabled={busy}>
            <Text style={[styles.actionBtnText, { color: colors.danger }]}>Decline</Text>
          </Pressable>
        )}
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

// ── Inviting members ─────────────────────────────────────────────────────────

// Shows the club's join code and shares it. The code is the only way in, and every request
// still has to be approved, so sharing it widely is safe.
function InviteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (replace = false) => {
    setError(null);
    setBusy(true);
    try {
      setInvite(await api<Invite>('/api/clubs/invite', replace ? { method: 'POST' } : undefined));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load the join code.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (open && !invite) load();
  }, [open, invite, load]);

  const share = () => {
    if (!invite) return;
    Share.share({
      message: `Join ${invite.clubName} on SHIFTUP.\n\n1. Get the SHIFTUP app and create an account.\n2. Open the Club tab and enter this code: ${invite.code}\n\nA club admin will then approve you.`,
    }).catch(() => null);
  };

  const replace = () =>
    Alert.alert('Make a new code?', 'The current code will stop working. People who have already asked to join are not affected.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'New code', style: 'destructive', onPress: () => load(true) },
    ]);

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <Text style={fonts.heading}>Invite members</Text>
        <Text style={[fonts.small, { marginTop: spacing.xs }]}>
          Share this code. New members enter it on their Club tab, and you approve each one under Approvals.
        </Text>
        <View style={styles.codeBox}>
          {invite ? (
            <Text style={styles.code} selectable accessibilityLabel={`Join code ${invite.code.split('').join(' ')}`}>
              {invite.code.slice(0, 3)} {invite.code.slice(3)}
            </Text>
          ) : error ? (
            <Text style={[fonts.small, { color: colors.danger, textAlign: 'center' }]}>{error}</Text>
          ) : (
            <ActivityIndicator color={colors.brandSky} />
          )}
        </View>
        <Pressable style={[styles.sheetPrimary, (!invite || busy) && { opacity: 0.5 }]} onPress={share} disabled={!invite || busy}>
          <Ionicons name="share-outline" size={18} color={colors.navy} />
          <Text style={styles.sheetPrimaryText}>Share invite</Text>
        </Pressable>
        <View style={styles.sheetLinks}>
          {error ? (
            <Pressable onPress={() => load()}><Text style={styles.sheetLink}>Try again</Text></Pressable>
          ) : (
            <Pressable onPress={replace} disabled={!invite || busy}><Text style={styles.sheetLink}>Make a new code</Text></Pressable>
          )}
          <Pressable onPress={onClose}><Text style={styles.sheetLink}>Done</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── Joining a club ───────────────────────────────────────────────────────────

// Shown to someone who is not in a club yet: enter the code an admin shared, then wait to be approved.
function JoinClub({ onJoined }: { onJoined: () => Promise<void> | void }) {
  const [code, setCode] = useState('');
  const [state, setState] = useState<JoinState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    try {
      setState(await api<JoinState>('/api/clubs/join'));
    } catch {
      setState({ state: 'none' });
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await api<JoinState>('/api/clubs/join', { method: 'POST', body: { code } });
      setState(result);
      if (result.state === 'member') await onJoined();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send your request. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  if (state?.state === 'pending') {
    return (
      <View style={[styles.center, { padding: spacing.xl, gap: spacing.md }]}>
        <Text style={{ fontSize: 40 }}>⏳</Text>
        <Text style={[fonts.heading, { textAlign: 'center' }]}>Request sent</Text>
        <Text style={[fonts.small, { textAlign: 'center' }]}>
          You have asked to join {state.clubName}. A club admin needs to approve you. This screen will change once they have.
        </Text>
        <Pressable style={styles.sheetPrimary} onPress={async () => { await onJoined(); await check(); }}>
          <Text style={styles.sheetPrimaryText}>Check again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.center, { padding: spacing.xl, gap: spacing.md }]}>
      <Text style={[fonts.heading, { textAlign: 'center' }]}>Join your club</Text>
      <Text style={[fonts.small, { textAlign: 'center' }]}>
        Ask your club admin for the club&apos;s 6-character join code and enter it here.
      </Text>
      <TextInput
        style={styles.codeInput}
        value={code}
        onChangeText={(text) => setCode(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
        placeholder="ABC234"
        placeholderTextColor={colors.textSubtle}
        autoCapitalize="characters"
        autoCorrect={false}
        spellCheck={false}
        maxLength={6}
        returnKeyType="go"
        onSubmitEditing={() => code.length === 6 && submit()}
        accessibilityLabel="Club join code"
      />
      {!!error && <Text style={[fonts.small, { color: colors.danger, textAlign: 'center' }]}>{error}</Text>}
      <Pressable style={[styles.sheetPrimary, (code.length !== 6 || busy) && { opacity: 0.5 }]} onPress={submit} disabled={code.length !== 6 || busy}>
        {busy ? <ActivityIndicator color={colors.navy} /> : <Text style={styles.sheetPrimaryText}>Ask to join</Text>}
      </Pressable>
      <Text style={[fonts.small, { textAlign: 'center', fontSize: 11 }]}>Starting a new club? Set it up at shift.club.</Text>
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
  statValue: { fontFamily: display.heavy, fontSize: 24 },

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

  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface1,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border as string, padding: spacing.md,
  },
  memberRole: { fontSize: 12, fontWeight: '700' },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: colors.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    borderWidth: 1, borderColor: colors.navyBorder, padding: spacing.xl, paddingBottom: spacing.xxl + spacing.lg,
  },
  codeBox: {
    marginTop: spacing.lg, minHeight: 84, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.navyBorder, backgroundColor: colors.surface1, padding: spacing.md,
  },
  code: { color: colors.gold, fontSize: 38, fontWeight: '800', letterSpacing: 6 },
  sheetPrimary: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch',
    backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 14, marginTop: spacing.lg,
  },
  sheetPrimaryText: { color: colors.navy, fontWeight: '800', fontSize: 16 },
  sheetLinks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg },
  sheetLink: { color: colors.brandSky, fontWeight: '600', fontSize: 14, padding: spacing.xs },
  codeInput: {
    alignSelf: 'stretch', textAlign: 'center', backgroundColor: colors.surface1, borderWidth: 1, borderColor: colors.navyBorder,
    borderRadius: radius.md, paddingVertical: 14, color: colors.white, fontSize: 28, fontWeight: '800', letterSpacing: 8,
  },
  actionBtnText: { fontWeight: '700', fontSize: 14 },
});

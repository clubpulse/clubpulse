import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Card } from '../components/Card';
import { useAuth } from '../hooks/useAuth';
import { useRoles } from '../hooks/useRoles';
import { getJuniorAgeCategory, isParentLinkRequired } from '../lib/roles';
import { api } from '../lib/api';
import { colors, fonts, radius, spacing } from '../constants/theme';

type DbsRecord = {
  id: string;
  holder_name: string;
  dbs_status: 'verified' | 'pending' | 'expired';
  expiry_date: string | null;
  role: string;
};

export default function SafeguardingScreen() {
  const { user } = useAuth();
  // Linked children come with the roles; see GET /api/profile/roles
  const { isAdmin, isParent, juniors, refresh: refreshRoles } = useRoles();
  const [dbsRecords, setDbsRecords] = useState<DbsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      // Admins get their club's DBS checks; everyone else only their own
      const { dbs } = await api<{ dbs: DbsRecord[] }>('/api/safeguarding');
      setDbsRecords(dbs);
    } catch {
      setDbsRecords([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), refreshRoles()]);
    setRefreshing(false);
  };

  const sections = [
    { key: 'header' },
    { key: 'age-gating' },
    { key: 'juniors' },
    { key: 'dbs' },
    { key: 'policies' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: 'Safeguarding', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.white }} />
        <View style={styles.center}><ActivityIndicator color={colors.brandSky} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Safeguarding', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.white }} />
      <FlatList
        data={sections}
        keyExtractor={(s) => s.key}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandSky} />}
        renderItem={({ item }) => {
          switch (item.key) {
            case 'header':
              return (
                <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
                  <Text style={fonts.heading}>Safeguarding</Text>
                  <Text style={fonts.small}>
                    Manage linked juniors, consent forms, and DBS verification for your club.
                  </Text>
                </View>
              );

            case 'age-gating':
              return (
                <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
                  <Text style={fonts.title}>Age-Gated Parent Linking</Text>
                  <Card>
                    <View style={{ gap: spacing.md }}>
                      <AgeRule
                        emoji="🔴"
                        label="Under 16 — Mandatory"
                        description="Cannot participate without an approved linked parent. Account locked until parent is linked and admin-approved."
                        color={colors.danger}
                      />
                      <View style={styles.divider} />
                      <AgeRule
                        emoji="🟡"
                        label="16–17 — Optional"
                        description="Can join independently but a parent may request to link. Admin approves each link."
                        color={colors.orange}
                      />
                      <View style={styles.divider} />
                      <AgeRule
                        emoji="🟢"
                        label="18+ — Not Applicable"
                        description="Full adult member. No parent linking available."
                        color={colors.success}
                      />
                    </View>
                  </Card>
                </View>
              );

            case 'juniors':
              return (
                <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
                  <View style={styles.row}>
                    <Text style={[fonts.title, { flex: 1 }]}>Linked Juniors</Text>
                    <Pressable
                      onPress={() => router.push('/register-child')}
                      style={({ pressed }) => [styles.addChildBtn, pressed && { opacity: 0.7 }]}
                    >
                      <Text style={styles.addChildText}>+ Add a child</Text>
                    </Pressable>
                  </View>
                  {juniors.length === 0 ? (
                    <Card>
                      <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.md }}>
                        <Text style={{ fontSize: 32 }}>👨‍👧</Text>
                        <Text style={fonts.regular}>No Linked Juniors</Text>
                        <Text style={[fonts.small, { textAlign: 'center' }]}>
                          {isParent
                            ? 'Children you register with your club will appear here.'
                            : 'Add your child to manage their consents and details with your club.'}
                        </Text>
                      </View>
                    </Card>
                  ) : (
                    juniors.map((j) => {
                      const ageCategory = j.date_of_birth ? getJuniorAgeCategory(j.date_of_birth) : null;
                      const linkRequired = ageCategory ? isParentLinkRequired(ageCategory) : null;

                      return (
                        <Pressable
                          key={j.id}
                          style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
                          onPress={() => router.push({ pathname: '/junior/[id]', params: { id: j.junior_id } })}
                        >
                          <View style={styles.row}>
                            <View style={styles.juniorAvatar}>
                              <Text style={styles.juniorAvatarText}>
                                {j.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={fonts.title}>{j.full_name}</Text>
                              {j.age_group && <Text style={fonts.small}>{j.age_group}</Text>}
                            </View>
                            <View style={{ alignItems: 'flex-end', gap: 4 }}>
                              {/* Link status badge */}
                              <View style={[styles.statusBadge, linkStatusStyle(j.link_status)]}>
                                <Text style={[styles.statusText, { color: linkStatusColor(j.link_status) }]}>
                                  {j.link_status === 'approved' ? '✓ Linked' : j.link_status === 'pending' ? '⏳ Pending' : '✗ Rejected'}
                                </Text>
                              </View>
                              {/* Consent badge */}
                              <View style={[styles.statusBadge, j.consent_given ? styles.statusGreen : styles.statusOrange]}>
                                <Text style={[styles.statusText, { color: j.consent_given ? colors.success : colors.orange }]}>
                                  {j.consent_given ? '✓ Consent' : 'No Consent'}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* Age category indicator */}
                          {ageCategory && (
                            <View style={[styles.ageCategoryBar, { backgroundColor: ageCategoryBg(ageCategory) }]}>
                              <Text style={{ fontSize: 12 }}>{ageCategoryEmoji(ageCategory)}</Text>
                              <Text style={[styles.ageCategoryText, { color: ageCategoryColor(ageCategory) }]}>
                                {ageCategory === 'under_16'
                                  ? 'Under 16 — Parent link mandatory'
                                  : ageCategory === '16_to_17'
                                  ? '16–17 — Parent link optional'
                                  : '18+ — No parent link needed'}
                              </Text>
                            </View>
                          )}

                          {/* Warning for U16 without approved link */}
                          {linkRequired === 'mandatory' && j.link_status !== 'approved' && (
                            <View style={styles.warningBar}>
                              <Text style={{ fontSize: 14 }}>⚠️</Text>
                              <Text style={styles.warningText}>
                                This junior cannot participate until this link is admin-approved.
                              </Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })
                  )}
                </View>
              );

            case 'dbs':
              return (
                <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
                  <Text style={fonts.title}>DBS Verification</Text>
                  {dbsRecords.length === 0 ? (
                    <Card>
                      <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.md }}>
                        <Text style={{ fontSize: 32 }}>🛡️</Text>
                        <Text style={fonts.regular}>No DBS Records</Text>
                        <Text style={[fonts.small, { textAlign: 'center' }]}>
                          {isAdmin ? 'DBS checks for your coaches and volunteers will appear here.' : 'Your own DBS check will appear here once your club records it.'}
                        </Text>
                      </View>
                    </Card>
                  ) : (
                    dbsRecords.map((d) => (
                      <View key={d.id} style={styles.card}>
                        <View style={styles.row}>
                          <View style={{ flex: 1 }}>
                            <Text style={fonts.regular}>{d.holder_name}</Text>
                            <Text style={fonts.small}>{d.role}</Text>
                          </View>
                          <View style={[styles.statusBadge, dbsStyle(d.dbs_status)]}>
                            <Text style={[styles.statusText, { color: dbsColor(d.dbs_status) }]}>
                              {d.dbs_status === 'verified' ? '✓ Verified' : d.dbs_status === 'pending' ? '⏳ Pending' : '⚠ Expired'}
                            </Text>
                          </View>
                        </View>
                        {d.expiry_date && (
                          <Text style={[fonts.small, { marginTop: spacing.xs }]}>
                            Expires: {new Date(d.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </Text>
                        )}
                      </View>
                    ))
                  )}
                </View>
              );

            case 'policies':
              return (
                <View style={{ gap: spacing.md }}>
                  <Text style={fonts.title}>Club Policies</Text>
                  <Card>
                    <View style={{ gap: spacing.md }}>
                      <PolicyRow label="Safeguarding Policy" icon="📄" />
                      <PolicyRow label="Code of Conduct" icon="📋" />
                      <PolicyRow label="Photography Consent" icon="📸" />
                      <PolicyRow label="Anti-Bullying Policy" icon="🤝" />
                    </View>
                  </Card>
                </View>
              );

            default:
              return null;
          }
        }}
      />
    </SafeAreaView>
  );
}

/* ─── Helper Components ─── */

function AgeRule({ emoji, label, description, color }: { emoji: string; label: string; description: string; color: string }) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text style={{ fontSize: 16 }}>{emoji}</Text>
        <Text style={[fonts.regular, { color, fontWeight: '600' }]}>{label}</Text>
      </View>
      <Text style={[fonts.small, { marginLeft: 28 }]}>{description}</Text>
    </View>
  );
}

function PolicyRow({ label, icon }: { label: string; icon: string }) {
  return (
    <Pressable style={({ pressed }) => [styles.policyRow, pressed && { opacity: 0.7 }]}>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <Text style={[fonts.regular, { flex: 1 }]}>{label}</Text>
      <Text style={{ color: colors.brandSky, fontSize: 16 }}>›</Text>
    </Pressable>
  );
}

/* ─── Helpers ─── */

function ageCategoryEmoji(cat: string) {
  return cat === 'under_16' ? '🔴' : cat === '16_to_17' ? '🟡' : '🟢';
}
function ageCategoryColor(cat: string) {
  return cat === 'under_16' ? colors.danger : cat === '16_to_17' ? colors.orange : colors.success;
}
function ageCategoryBg(cat: string) {
  return cat === 'under_16' ? 'rgba(248,113,113,0.1)' : cat === '16_to_17' ? colors.orangeDim : colors.successDim;
}

function linkStatusColor(status: string) {
  return status === 'approved' ? colors.success : status === 'pending' ? colors.orange : colors.danger;
}
function linkStatusStyle(status: string) {
  return status === 'approved'
    ? { backgroundColor: colors.successDim }
    : status === 'pending'
    ? { backgroundColor: colors.orangeDim }
    : { backgroundColor: 'rgba(248,113,113,0.12)' };
}

function dbsColor(status: string): string {
  return status === 'verified' ? colors.success : status === 'pending' ? colors.orange : colors.danger;
}
function dbsStyle(status: string) {
  return status === 'verified'
    ? { backgroundColor: colors.successDim }
    : status === 'pending'
    ? { backgroundColor: colors.orangeDim }
    : { backgroundColor: 'rgba(248,113,113,0.12)' };
}

const styles = StyleSheet.create({
  addChildBtn: {
    borderWidth: 1,
    borderColor: colors.brandPrimary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  addChildText: { color: colors.brandSky, fontWeight: '600', fontSize: 13 },
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
  juniorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(96,165,250,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  juniorAvatarText: { color: colors.brandSky, fontWeight: '700', fontSize: 15 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  statusGreen: { backgroundColor: colors.successDim },
  statusOrange: { backgroundColor: colors.orangeDim },
  statusText: { fontSize: 12, fontWeight: '600' },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border as string,
  },
  ageCategoryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  ageCategoryText: { fontSize: 11, fontWeight: '600' },
  warningBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.25)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginTop: spacing.sm,
  },
  warningText: { fontSize: 11, fontWeight: '600', color: colors.danger, flex: 1 },
});

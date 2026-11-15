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
import { Stack } from 'expo-router';
import { Card } from '../components/Card';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { colors, fonts, radius, spacing } from '../constants/theme';

type LinkedJunior = {
  id: string;
  full_name: string;
  age_group: string | null;
  consent_given: boolean;
  consent_date: string | null;
};

type DbsRecord = {
  id: string;
  holder_name: string;
  dbs_status: 'verified' | 'pending' | 'expired';
  expiry_date: string | null;
  role: string;
};

export default function SafeguardingScreen() {
  const { user } = useAuth();
  const [juniors, setJuniors] = useState<LinkedJunior[]>([]);
  const [dbsRecords, setDbsRecords] = useState<DbsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      // Linked juniors (parent → child relationship)
      const { data: juniorRows } = await supabase
        .from('linked_juniors')
        .select('id, full_name, age_group, consent_given, consent_date')
        .eq('parent_id', user.id)
        .order('full_name');

      setJuniors(juniorRows ?? []);

      // DBS records visible to this user (their own club's staff)
      const { data: dbsRows } = await supabase
        .from('dbs_records')
        .select('id, holder_name, dbs_status, expiry_date, role')
        .order('expiry_date', { ascending: true })
        .limit(20);

      setDbsRecords(dbsRows ?? []);
    } catch {
      // non-critical — tables may not exist yet
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

  const sections = [
    { key: 'header' },
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

            case 'juniors':
              return (
                <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
                  <Text style={fonts.title}>Linked Juniors</Text>
                  {juniors.length === 0 ? (
                    <Card>
                      <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.md }}>
                        <Text style={{ fontSize: 32 }}>👨‍👧</Text>
                        <Text style={fonts.regular}>No Linked Juniors</Text>
                        <Text style={[fonts.small, { textAlign: 'center' }]}>
                          Link your child's account to manage consent and track their activity safely.
                        </Text>
                      </View>
                    </Card>
                  ) : (
                    juniors.map((j) => (
                      <View key={j.id} style={styles.card}>
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
                          <View style={[styles.statusBadge, j.consent_given ? styles.statusGreen : styles.statusOrange]}>
                            <Text style={[styles.statusText, { color: j.consent_given ? colors.success : colors.orange }]}>
                              {j.consent_given ? '✓ Consent' : 'Pending'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))
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
                          DBS checks for coaches and volunteers will appear here.
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

function PolicyRow({ label, icon }: { label: string; icon: string }) {
  return (
    <Pressable style={({ pressed }) => [styles.policyRow, pressed && { opacity: 0.7 }]}>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <Text style={[fonts.regular, { flex: 1 }]}>{label}</Text>
      <Text style={{ color: colors.brandSky, fontSize: 16 }}>›</Text>
    </Pressable>
  );
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
});

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { api, ApiError } from '../../lib/api';
import { CONSENTS } from '../../lib/consents';
import { colors, fonts, radius, spacing } from '../../constants/theme';

// A child is a record their parent manages, not an account of their own: they have no
// sign-in, steps or wallet. This screen shows the record and lets the parent give or
// withdraw each consent. Served by GET /api/juniors/:id, which only answers for a linked parent.

type ConsentState = 'granted' | 'withdrawn';

type Junior = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  medical_notes: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  relationship: string;
  link_verified: boolean;
  consents: Record<string, ConsentState>;
};

function formatDate(iso: string | null): string {
  if (!iso) return 'Not given';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function JuniorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [junior, setJunior] = useState<Junior | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setJunior(await api<Junior>(`/api/juniors/${id}`));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? 'This junior is not linked to your account.' : 'Could not load this junior.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  async function setConsent(type: string, granted: boolean) {
    if (!junior) return;
    const action: ConsentState = granted ? 'granted' : 'withdrawn';
    const before = junior.consents;
    setSaving(type);
    setJunior({ ...junior, consents: { ...before, [type]: action } });
    try {
      await api('/api/club/consent', { method: 'POST', body: { childId: junior.id, consentType: type, action } });
    } catch (e) {
      // Put the switch back: a consent that didn't save must not look saved
      setJunior((current) => (current ? { ...current, consents: before } : current));
      Alert.alert('Not saved', e instanceof ApiError ? e.message : 'Check your connection and try again.');
    } finally {
      setSaving(null);
    }
  }

  const initials = junior?.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';

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
          <Text style={fonts.title}>Not available</Text>
          <Text style={[fonts.small, { textAlign: 'center' }]}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandSky} />}
        >
          <View style={styles.profileCard}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
            <Text style={fonts.title}>{junior.full_name}</Text>
            <Text style={fonts.small}>Born {formatDate(junior.date_of_birth)}</Text>
            <View style={[styles.pill, junior.link_verified ? styles.greenPill : styles.orangePill]}>
              <Text style={[styles.pillText, { color: junior.link_verified ? colors.success : colors.orange }]}>
                {junior.link_verified ? `Verified ${junior.relationship}` : 'Waiting for your club to verify you'}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>CONSENTS</Text>
          <View style={styles.card}>
            {CONSENTS.map((c, index) => (
              <View key={c.type} style={[styles.consentRow, index > 0 && styles.divider]}>
                <View style={{ flex: 1 }}>
                  <Text style={fonts.regular}>{c.label}</Text>
                  <Text style={fonts.small}>{c.detail}</Text>
                </View>
                <Switch
                  value={junior.consents[c.type] === 'granted'}
                  onValueChange={(value) => setConsent(c.type, value)}
                  disabled={saving !== null}
                  trackColor={{ true: colors.success, false: colors.navyBorder }}
                />
              </View>
            ))}
          </View>
          <Text style={fonts.small}>
            Each change is recorded with the date and your name, and your club can see it. You can withdraw a consent at any time.
          </Text>

          <Text style={styles.sectionLabel}>EMERGENCY CONTACT</Text>
          <View style={styles.card}>
            <Text style={fonts.regular}>{junior.emergency_contact_name ?? 'Not given'}</Text>
            {junior.emergency_contact_phone && <Text style={fonts.small}>{junior.emergency_contact_phone}</Text>}
          </View>

          <Text style={styles.sectionLabel}>MEDICAL NOTES</Text>
          <View style={styles.card}>
            <Text style={fonts.regular}>{junior.medical_notes?.trim() || 'None recorded'}</Text>
          </View>
          <Text style={fonts.small}>To change these details, contact your club.</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  content: { padding: spacing.lg, gap: spacing.md },
  profileCard: {
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border as string,
    padding: spacing.lg,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.orangeDim, marginBottom: spacing.xs,
  },
  avatarText: { color: colors.orange, fontSize: 22, fontWeight: '700' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, marginTop: spacing.xs },
  greenPill: { backgroundColor: colors.successDim },
  orangePill: { backgroundColor: colors.orangeDim },
  pillText: { fontSize: 12, fontWeight: '600' },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(232,237,245,0.4)', letterSpacing: 0.5, marginTop: spacing.sm },
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border as string,
    padding: spacing.md,
  },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  divider: { borderTopWidth: 1, borderTopColor: colors.border as string },
});

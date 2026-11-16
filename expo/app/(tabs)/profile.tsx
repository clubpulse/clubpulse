import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Card } from '../../components/Card';
import { useAuth } from '../../hooks/useAuth';
import { useRoles } from '../../hooks/useRoles';
import { ROLE_CONFIG, pendingRoles } from '../../lib/roles';
import { api, ApiError, type Profile, type Wallet } from '../../lib/api';
import { colors, fonts, radius, spacing } from '../../constants/theme';

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { active, roles } = useRoles();
  const pending = pendingRoles(roles);
  const [data, setData] = useState<{ profile: Profile; wallet: Wallet | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ profile: Profile; wallet: Wallet | null }>('/api/profile')
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load your profile'));
  }, []);

  function confirmSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  const initial = data?.profile.display_name?.[0]?.toUpperCase() ?? '?';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={fonts.heading}>Profile</Text>

        {error ? (
          <Text style={{ color: colors.danger }}>{error}</Text>
        ) : !data ? (
          <ActivityIndicator color={colors.gold} />
        ) : (
          <>
            <Card style={{ alignItems: 'center', gap: spacing.sm }}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
              <Text style={fonts.title}>{data.profile.full_name}</Text>
              <Text style={fonts.small}>{data.profile.email}</Text>

              {/* Role badges */}
              <View style={styles.roleBadgeRow}>
                {active.map((role) => (
                  <View key={role} style={[styles.roleBadge, { backgroundColor: ROLE_CONFIG[role].dimColor }]}>
                    <Text style={[styles.roleBadgeText, { color: ROLE_CONFIG[role].color }]}>
                      {ROLE_CONFIG[role].label}
                    </Text>
                  </View>
                ))}
                {pending.map((role) => (
                  <View key={`p-${role}`} style={[styles.roleBadge, { backgroundColor: 'rgba(255,255,255,0.04)' }]}>
                    <Text style={[styles.roleBadgeText, { color: colors.textMuted as string }]}>
                      ⏳ {ROLE_CONFIG[role].label}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>

            <Card>
              <Text style={fonts.small}>LIFETIME SCORES EARNED</Text>
              <Text style={[fonts.title, { fontSize: 28, marginTop: spacing.xs }]}>
                {(data.wallet?.lifetime_earned ?? 0).toLocaleString('en-GB')}
              </Text>
            </Card>
          </>
        )}

        {/* Quick links */}
        <View style={{ gap: spacing.sm }}>
          <ProfileLink label="🛡️  Safeguarding" onPress={() => router.push('/safeguarding')} />
          <ProfileLink label="💰  Wallet" onPress={() => router.push('/wallet' as any)} />
          <ProfileLink label="🛒  Marketplace" onPress={() => router.push('/marketplace' as any)} />
          <ProfileLink label="🤖  AI Coach" onPress={() => router.push('/companion' as any)} />
          <ProfileLink label="📖  My Sporting Soul" onPress={() => router.push('/sporting-soul')} />
        </View>

        <Pressable onPress={confirmSignOut} style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.7 }]}>
          <Text style={{ color: colors.danger, fontWeight: '600' }}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.profileLink, pressed && { opacity: 0.7 }]}
    >
      <Text style={fonts.regular}>{label}</Text>
      <Text style={{ color: colors.brandSky, fontSize: 18 }}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontSize: 28, fontWeight: '700' },
  signOut: { borderWidth: 1, borderColor: colors.navyBorder, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  profileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border as string,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  roleBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.xs },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  roleBadgeText: { fontSize: 11, fontWeight: '600' },
});

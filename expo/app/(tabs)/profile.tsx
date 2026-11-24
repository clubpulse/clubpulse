import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Card } from '../../components/Card';
import { useAuth } from '../../hooks/useAuth';
import { useRoles } from '../../hooks/useRoles';
import { ROLE_CONFIG, pendingRoles } from '../../lib/roles';
import { api, ApiError, type Profile, type Wallet } from '../../lib/api';
import { PRIVACY_URL, TERMS_URL } from '../../constants/features';
import { colors, fonts, radius, spacing } from '../../constants/theme';
import { BackBar } from '../../components/BackBar';

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { active, roles } = useRoles();
  const pending = pendingRoles(roles);
  const [data, setData] = useState<{ profile: Profile; wallet: Wallet | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  async function deleteAccount() {
    setDeleting(true);
    try {
      await api<{ ok: true }>('/api/profile', { method: 'DELETE' });
      await signOut();
    } catch (e) {
      setDeleting(false);
      Alert.alert(
        'Could not delete your account',
        e instanceof ApiError ? e.message : 'Check your connection and try again.',
      );
    }
  }

  // Two steps, because this cannot be undone
  function confirmDeleteAccount() {
    Alert.alert(
      'Delete your account?',
      'Your profile, step history, roles and club memberships will be removed, and any Scores you have will be lost. Records your club has to keep, such as safeguarding records, stay with the club without your name on your profile.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () =>
            Alert.alert('This cannot be undone', 'Delete your SHIFTUP account permanently?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete account', style: 'destructive', onPress: deleteAccount },
            ]),
        },
      ],
    );
  }

  const initial = data?.profile.display_name?.[0]?.toUpperCase() ?? '?';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BackBar />
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
          <ProfileLink label="🛡️ Safeguarding" onPress={() => router.push('/safeguarding')} />
          <ProfileLink label="💰 Wallet" onPress={() => router.push('/wallet' as any)} />
          <ProfileLink label="🛒 Marketplace" onPress={() => router.push('/marketplace' as any)} />
          <ProfileLink label="🤖 Coach AI" onPress={() => router.push('/companion' as any)} />
          <ProfileLink label="📖 My Sporting Soul" onPress={() => router.push('/sporting-soul')} />
          {PRIVACY_URL && <ProfileLink label="🔒 Privacy policy" onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL!)} />}
          {TERMS_URL && <ProfileLink label="📄 Terms of use" onPress={() => WebBrowser.openBrowserAsync(TERMS_URL!)} />}
        </View>

        <Pressable onPress={confirmSignOut} style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.7 }]}>
          <Text style={{ color: colors.danger, fontWeight: '600' }}>Sign out</Text>
        </Pressable>

        <Pressable
          onPress={confirmDeleteAccount}
          disabled={deleting}
          style={({ pressed }) => [styles.deleteAccount, pressed && { opacity: 0.7 }]}
        >
          {deleting ? (
            <ActivityIndicator color={colors.textMuted as string} />
          ) : (
            <Text style={fonts.small}>Delete account</Text>
          )}
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
  deleteAccount: { paddingVertical: spacing.md, alignItems: 'center' },
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

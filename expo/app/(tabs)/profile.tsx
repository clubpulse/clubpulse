import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import { useAuth } from '../../hooks/useAuth';
import { api, ApiError, type Profile, type Wallet } from '../../lib/api';
import { colors, fonts, radius, spacing } from '../../constants/theme';

export default function ProfileScreen() {
  const { signOut } = useAuth();
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
            </Card>
            <Card>
              <Text style={fonts.small}>LIFETIME CREDS EARNED</Text>
              <Text style={[fonts.title, { fontSize: 28, marginTop: spacing.xs }]}>
                {(data.wallet?.lifetime_earned ?? 0).toLocaleString('en-GB')}
              </Text>
            </Card>
          </>
        )}

        <Pressable onPress={confirmSignOut} style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.7 }]}>
          <Text style={{ color: colors.danger, fontWeight: '600' }}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  content: { padding: spacing.lg, gap: spacing.lg },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontSize: 28, fontWeight: '700' },
  signOut: { borderWidth: 1, borderColor: colors.navyBorder, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
});

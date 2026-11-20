// One role's page on its own screen. Home shows the same dashboard; this is where a link to a
// particular role lands.

import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_PAGES, isPageRole, type PageRole } from '../../lib/rolePages';
import { RoleDashboard, useRolePage } from '../../components/RoleDashboard';
import { colors, spacing } from '../../constants/theme';

export default function RoleScreen() {
  const params = useLocalSearchParams<{ role: string }>();
  const role: PageRole = isPageRole(params.role) ? params.role : 'player';
  const page = ROLE_PAGES[role];
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { data, error, load } = useRolePage(role);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = ((user?.user_metadata?.full_name as string | undefined) ?? '').split(' ')[0] || 'You';

  useEffect(() => { navigation.setOptions({ title: page.title }); }, [navigation, page.title]);

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={page.from} />}>
        <RoleDashboard role={role} firstName={firstName} data={data} error={error} onRetry={load} onSwitch={(r) => router.replace(`/role/${r}` as never)} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
});

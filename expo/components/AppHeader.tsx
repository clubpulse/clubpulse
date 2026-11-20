// The bar at the top of every screen opened from a tab: a back button and the screen's title.
// Drawn by the app itself, not by iOS, so the back button behaves the same on every phone and
// every version of iOS.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, display } from '../constants/theme';

type Props = {
  navigation: { canGoBack: () => boolean; goBack: () => void };
  options: { title?: string };
};

export function AppHeader({ navigation, options }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Nothing to go back to (the screen was opened from a link or a notification): go Home
  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : router.replace('/'));

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6, paddingLeft: 12 + insets.left, paddingRight: 12 + insets.right }]}>
      <Pressable
        onPress={goBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}
      >
        <Ionicons name="chevron-back" size={22} color={colors.white} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>
      <Text style={styles.title} numberOfLines={1} accessibilityRole="header">{options.title ?? ''}</Text>
      {/* Balances the back button so the title sits in the middle */}
      <View style={styles.side} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, paddingHorizontal: 12, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border as string,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 84, paddingVertical: 6 },
  backText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  title: { flex: 1, textAlign: 'center', color: colors.white, fontFamily: display.bold, fontSize: 16 },
  side: { width: 84 },
});

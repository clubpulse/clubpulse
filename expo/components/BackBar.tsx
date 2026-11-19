// A Back button for the top of a tab screen. Tab screens have no top bar of their own, so without
// this there is no visible way back to the page you came from. Goes to the previous page, or Home
// if there is none. The matching swipe from the left edge lives in the tab layout (see Wide.tsx).

import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

export function BackBar() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Back"
      style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name="chevron-back" size={20} color={colors.brandSky} />
      <Text style={styles.text}>Back</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', paddingHorizontal: 12, paddingTop: 6, paddingBottom: 2 },
  text: { color: colors.brandSky, fontSize: 16, fontWeight: '600' },
});

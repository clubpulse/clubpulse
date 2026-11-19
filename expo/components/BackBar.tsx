// A way back for the top of a tab screen. Tab screens have no top bar of their own, so this gives
// every page the same two ways back that pushed pages have: a Back button, and a swipe in from
// the left edge of the screen. Both go to the page you came from, or Home if there is none.

import { useMemo } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

/** How far in from the left edge a swipe may start, and how far it must travel to count. */
const EDGE = 24;
const TRAVEL = 60;

export function BackBar() {
  const router = useRouter();
  const goBack = useMemo(() => () => (router.canGoBack() ? router.back() : router.replace('/')), [router]);

  // Only a mostly sideways drag to the right is taken, so scrolling up and down still works
  const swipe = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => g.dx > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx > TRAVEL || (g.dx > 30 && g.vx > 0.4)) goBack();
      },
    }),
    [goBack],
  );

  return (
    <>
      <Pressable
        onPress={goBack}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}
      >
        <Ionicons name="chevron-back" size={20} color={colors.brandSky} />
        <Text style={styles.text}>Back</Text>
      </Pressable>
      {/* An invisible strip down the left edge that catches the swipe */}
      <View style={styles.edge} {...swipe.panHandlers} accessible={false} importantForAccessibility="no" />
    </>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', paddingHorizontal: 12, paddingTop: 6, paddingBottom: 2, zIndex: 2 },
  text: { color: colors.brandSky, fontSize: 16, fontWeight: '600' },
  edge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: EDGE, zIndex: 1 },
});

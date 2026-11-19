// Keeps a page readable on an iPad. On a phone it does nothing. On a wide screen the page sits in
// a centred column so that lines of text and cards do not stretch across the whole display, while
// the top bar and the tab bar still run edge to edge.

import { useMemo } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

/** The widest a page gets. An iPad in portrait is 768 to 1032 points across. */
export const PAGE_WIDTH = 760;

export function Wide({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.outer}>
      <View style={styles.column}>{children}</View>
    </View>
  );
}

/**
 * The same column for a tab page, plus an invisible strip down the left edge of the screen that
 * takes a swipe to the right as "go back". Tab pages have no system back gesture of their own.
 */
export function WideWithSwipeBack({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const swipe = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      // Only a mostly sideways drag to the right is taken, so scrolling up and down still works
      onMoveShouldSetPanResponder: (_, g) => g.dx > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx > 60 || (g.dx > 30 && g.vx > 0.4)) {
          if (router.canGoBack()) router.back();
          else router.replace('/');
        }
      },
    }),
    [router],
  );

  return (
    <View style={styles.outer}>
      <View style={styles.column}>{children}</View>
      <View style={styles.edge} {...swipe.panHandlers} accessible={false} importantForAccessibility="no" />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: PAGE_WIDTH },
  edge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 24 },
});

// The thought for the day: one line about the mind side of cricket, changing at midnight.
// Shown at the top of Warm-Up, the wellness page.

import { StyleSheet, Text, View } from 'react-native';
import { thoughtFor } from '../lib/quotes';
import { colors, display, radius, spacing } from '../constants/theme';

const PINK = '#F472B6';

export function DailyThought() {
  const thought = thoughtFor();
  return (
    <View style={styles.card} accessible accessibilityLabel={`Thought for the day. ${thought}`}>
      <Text style={styles.eyebrow}>THOUGHT FOR THE DAY</Text>
      <Text style={styles.text}>{thought}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(244,114,182,0.45)', backgroundColor: 'rgba(244,114,182,0.10)', padding: spacing.lg, gap: 6 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: PINK },
  text: { fontFamily: display.bold, fontSize: 17, lineHeight: 24, color: colors.white },
});

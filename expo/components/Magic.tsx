// The animated pieces the role pages are built from: a header with slowly drifting colour, numbers
// that count up, and cards that fade in one after another and press in when touched. Everything
// stops moving for people who have asked their phone to reduce motion.

import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { colors, radius } from '../constants/theme';

/** True when the person has asked their phone to cut down on motion. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => { if (live) setReduced(on); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { live = false; sub.remove(); };
  }, []);
  return reduced;
}

const BLOB = 420;

/** A header panel with two soft patches of colour that drift slowly behind its content. */
export function Hero({ from, to, children, style }: { from: string; to: string; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 7000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(drift, { toValue: 0, duration: 7000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [drift, reduced]);

  const a = { transform: [{ translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, 26] }) }, { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) }, { scale: drift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }] };
  const b = { transform: [{ translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -22] }) }, { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, 16] }) }, { scale: drift.interpolate({ inputRange: [0, 1], outputRange: [1.1, 1] }) }] };

  return (
    <View style={[styles.hero, { borderColor: `${from}55` }, style]}>
      <Animated.View pointerEvents="none" style={[styles.blob, { top: -150, left: -110 }, a]}><Glow colour={from} /></Animated.View>
      <Animated.View pointerEvents="none" style={[styles.blob, { bottom: -190, right: -120 }, b]}><Glow colour={to} strength={0.8} /></Animated.View>
      {children}
    </View>
  );
}

// A soft patch of colour. The phone cannot blur without an extra library, so the fade at the edge
// is built from rings: each one a little smaller and adding a little more colour.
const RINGS = [1, 0.86, 0.72, 0.58, 0.44, 0.3];
function Glow({ colour, strength = 1 }: { colour: string; strength?: number }) {
  return (
    <>
      {RINGS.map((size) => (
        <View key={size} style={{
          position: 'absolute', width: BLOB * size, height: BLOB * size, borderRadius: (BLOB * size) / 2,
          left: (BLOB * (1 - size)) / 2, top: (BLOB * (1 - size)) / 2, backgroundColor: colour, opacity: 0.085 * strength,
        }} />
      ))}
    </>
  );
}

const format = (n: number) => Math.round(n).toLocaleString('en-GB');

/** A number that counts up to its value when it appears. Screen readers hear the final figure. */
export function CountUp({ value, style, duration = 1100 }: { value: number; style?: StyleProp<TextStyle>; duration?: number }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced || value === 0) return;
    progress.setValue(0);
    const id = progress.addListener(({ value: t }) => setShown(value * t));
    Animated.timing(progress, { toValue: 1, duration, easing: Easing.out(Easing.poly(4)), useNativeDriver: false }).start();
    return () => progress.removeListener(id);
  }, [value, duration, reduced, progress]);

  return <Text style={style} accessibilityLabel={format(value)}>{format(reduced ? value : shown)}</Text>;
}

/** A card that fades up into place (later for a higher `index`) and presses in when touched. */
export function GlowCard({ index = 0, tint, onPress, label, style, slot, children }: {
  index?: number; tint?: string; onPress?: () => void; label?: string; style?: StyleProp<ViewStyle>;
  /** How the card sits among its neighbours (its share of a row), as opposed to how it looks */
  slot?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const appear = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) { appear.setValue(1); return; }
    Animated.timing(appear, { toValue: 1, duration: 520, delay: index * 70, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [appear, index, reduced]);

  const pressTo = (to: number) => Animated.spring(press, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  const motion = {
    opacity: appear,
    transform: [
      { translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
      { scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }) },
    ],
  };
  const look = [styles.card, tint ? { borderColor: `${tint}40` } : null, style, motion];
  if (!onPress) return <Animated.View style={[slot, look]}>{children}</Animated.View>;
  return (
    <Pressable style={slot} onPress={onPress} onPressIn={() => pressTo(1)} onPressOut={() => pressTo(0)} accessibilityRole="button" accessibilityLabel={label}>
      <Animated.View style={[look, slot ? { flex: 1 } : null]}>{children}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden', borderRadius: 26, borderWidth: 1, backgroundColor: '#060D24', padding: 22 },
  blob: { position: 'absolute', width: BLOB, height: BLOB },
  card: { backgroundColor: colors.surface1, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: 16 },
});

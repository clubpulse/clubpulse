// The look of the auction floor: a card portrait for each player, bidding paddles for the six
// franchises, the price that jumps when it changes, and the SOLD stamp.
//
// Players are drawn as illustrated avatars (initials on their country's colours), not photographs.
// Photographs of real cricketers belong to the players, boards and agencies, and using them in an
// app needs a licence.

import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';

type Role = 'BAT' | 'WK' | 'AR' | 'PACE' | 'SPIN';

// Shirt and trim colours by country name, as the engine spells them
const KIT: Record<string, [string, string]> = {
  India: ['#1E66D0', '#F28C28'],
  Australia: ['#F2C01D', '#0B6B3A'],
  England: ['#1B3A8C', '#D7263D'],
  'New Zealand': ['#1A1A1A', '#B8C0CC'],
  'South Africa': ['#0B7A4B', '#F2C01D'],
  'West Indies': ['#7B1E3A', '#F2C01D'],
  Afghanistan: ['#0F5CC0', '#D7263D'],
  'Sri Lanka': ['#102A6B', '#F2B01D'],
};

const ROLE_ICON: Record<Role, keyof typeof MaterialCommunityIcons.glyphMap> = {
  BAT: 'cricket',
  WK: 'hand-back-right',
  AR: 'star-four-points',
  PACE: 'lightning-bolt',
  SPIN: 'rotate-right',
};

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** A player's portrait: initials on a shirt in their country's colours, with a badge for their role. */
export function PlayerAvatar({ name, country, role, roleColor, size = 84, lotKey, plain }: {
  name: string; country: string; role: Role; roleColor: string; size?: number;
  /** Changes when a new player comes up, to replay the entrance */
  lotKey?: number | string;
  /** Small version for the squad grid: no role badge */
  plain?: boolean;
}) {
  const [shirt, trim] = KIT[country] ?? [colors.brandPrimary, colors.gold];
  const enter = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (lotKey === undefined) return;
    enter.setValue(0);
    Animated.spring(enter, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }).start();
  }, [enter, lotKey]);

  const dark = shirt === '#F2C01D';
  return (
    <Animated.View
      style={{
        width: size, height: size,
        opacity: enter,
        transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
      }}
    >
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: shirt, borderColor: trim, borderWidth: plain ? 1.5 : 3 }]}>
        {/* Collar stripe */}
        {!plain && <View style={[styles.collar, { backgroundColor: trim, width: size * 0.5, top: size * 0.06 }]} />}
        <Text style={[styles.avatarText, { fontSize: size * (plain ? 0.4 : 0.36), letterSpacing: plain ? 0 : 1, color: dark ? '#10203A' : '#FFFFFF' }]}>{initials(name)}</Text>
      </View>
      {!plain && (
        <View style={[styles.roleBadge, { backgroundColor: colors.background, borderColor: roleColor }]}>
          <MaterialCommunityIcons name={ROLE_ICON[role]} size={size * 0.2} color={roleColor} />
        </View>
      )}
    </Animated.View>
  );
}

const TEAM_COLOURS = [colors.gold, '#F97316', '#22C55E', '#C084FC', '#38BDF8', '#F472B6'];

/** One paddle per franchise. The one holding the bid is raised and lit. */
export function Paddles({ names, holder, out }: { names: string[]; holder: number; out: boolean }) {
  return (
    <View style={styles.paddles}>
      {names.map((name, team) => (
        <Paddle key={name} label={team === 0 ? 'YOU' : initials(name)} colour={TEAM_COLOURS[team % TEAM_COLOURS.length]}
          raised={holder === team} dimmed={team === 0 && out} />
      ))}
    </View>
  );
}

function Paddle({ label, colour, raised, dimmed }: { label: string; colour: string; raised: boolean; dimmed: boolean }) {
  const lift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(lift, { toValue: raised ? 1 : 0, friction: 5, tension: 120, useNativeDriver: true }).start();
  }, [lift, raised]);
  return (
    <Animated.View
      style={{
        alignItems: 'center',
        opacity: dimmed ? 0.3 : 1,
        transform: [
          { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
          { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) },
        ],
      }}
    >
      <View style={[styles.paddleHead, { borderColor: colour, backgroundColor: raised ? colour : 'transparent' }]}>
        <Text style={[styles.paddleText, { color: raised ? colors.navy : colour }]}>{label}</Text>
      </View>
      <View style={[styles.paddleHandle, { backgroundColor: colour, opacity: raised ? 1 : 0.5 }]} />
    </Animated.View>
  );
}

/** The current price. It jumps each time the bid goes up. */
export function PulsingPrice({ text, value }: { text: string; value: number }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    pulse.setValue(1.22);
    Animated.spring(pulse, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }).start();
  }, [pulse, value]);
  return <Animated.Text style={[styles.price, { transform: [{ scale: pulse }] }]}>{text}</Animated.Text>;
}

/** The hammer, rocking back for "going once" and "going twice" and coming down on a sale. */
export function Hammer({ count, done }: { count: number; done: boolean }) {
  const swing = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(swing, {
      toValue: done ? 2 : count > 0 ? 1 : 0,
      duration: done ? 160 : 260,
      easing: done ? Easing.in(Easing.quad) : Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [swing, count, done]);
  return (
    <Animated.View
      style={{ transform: [{ rotate: swing.interpolate({ inputRange: [0, 1, 2], outputRange: ['0deg', '-38deg', '28deg'] }) }] }}
    >
      <Ionicons name="hammer" size={22} color={count > 0 || done ? colors.gold : colors.textSubtle} />
    </Animated.View>
  );
}

/** Stamped across the card when the hammer falls. */
export function SoldStamp({ show, sold, mine, line }: { show: boolean; sold: boolean; mine: boolean; line: string }) {
  const stamp = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!show) {
      stamp.setValue(0);
      return;
    }
    Animated.spring(stamp, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }).start();
  }, [stamp, show]);
  if (!show) return null;
  const colour = !sold ? colors.textMuted : mine ? colors.success : colors.gold;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.stamp,
        { borderColor: colour, opacity: stamp, transform: [{ rotate: '-9deg' }, { scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [2.4, 1] }) }] },
      ]}
    >
      <Text style={[styles.stampText, { color: colour }]}>{sold ? 'SOLD' : 'UNSOLD'}</Text>
      {!!line && <Text style={[styles.stampLine, { color: colour }]} numberOfLines={1}>{line}</Text>}
    </Animated.View>
  );
}

/** One squad objective with a live count and bar. Flashes when the count goes up. */
export function ObjectiveMeter({ label, have, need, met, wouldHelp }: {
  label: string; have: number; need: number; met: boolean;
  /** The player on the block would add one to this */
  wouldHelp: boolean;
}) {
  const flash = useRef(new Animated.Value(0)).current;
  const previous = useRef(have);
  useEffect(() => {
    if (have > previous.current) {
      flash.setValue(1);
      Animated.timing(flash, { toValue: 0, duration: 900, useNativeDriver: true }).start();
    }
    previous.current = have;
  }, [flash, have]);
  const shown = Math.min(have, need);
  const colour = met ? colors.success : wouldHelp ? colors.gold : colors.textMuted;
  return (
    <Animated.View style={[styles.meter, { transform: [{ scale: flash.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] }]}>
      <View style={styles.meterHead}>
        <Ionicons name={met ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={met ? colors.success : colors.textSubtle} />
        <Text style={[styles.meterLabel, met && { color: colors.text }]} numberOfLines={1}>{label}</Text>
        <Text style={[styles.meterCount, { color: colour }]}>
          {have}/{need}
        </Text>
      </View>
      <View style={styles.meterTrack}>
        <View style={[styles.meterFill, { width: `${(shown / need) * 100}%`, backgroundColor: met ? colors.success : colors.brandSky }]} />
        {wouldHelp && !met && (
          <View style={[styles.meterFill, styles.meterNext, { left: `${(shown / need) * 100}%`, width: `${(1 / need) * 100}%` }]} />
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 3, overflow: 'hidden' },
  collar: { position: 'absolute', height: 5, borderRadius: 3, opacity: 0.9 },
  avatarText: { fontWeight: '800', letterSpacing: 1 },
  roleBadge: {
    position: 'absolute', right: -4, bottom: -4, borderWidth: 2, borderRadius: radius.pill,
    padding: 4, alignItems: 'center', justifyContent: 'center',
  },
  paddles: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg, paddingHorizontal: spacing.xs },
  paddleHead: { minWidth: 40, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  paddleText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  paddleHandle: { width: 4, height: 12, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  price: { fontSize: 44, fontWeight: '800', color: colors.gold, textAlign: 'center' },
  stamp: {
    position: 'absolute', alignSelf: 'center', top: '44%', borderWidth: 4, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: 'rgba(4,9,26,0.88)', alignItems: 'center', maxWidth: '88%',
  },
  stampText: { fontSize: 34, fontWeight: '900', letterSpacing: 4 },
  stampLine: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  meter: { width: '48%', marginBottom: spacing.sm },
  meterHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meterLabel: { flex: 1, fontSize: 12, color: colors.textMuted },
  meterCount: { fontSize: 12, fontWeight: '800' },
  meterTrack: { height: 5, borderRadius: 3, backgroundColor: colors.surface2, marginTop: 4, overflow: 'hidden' },
  meterFill: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 3 },
  meterNext: { backgroundColor: colors.gold, opacity: 0.55 },
});

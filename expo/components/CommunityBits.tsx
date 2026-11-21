// Small pieces the Community screens share: filter chips, an avatar, the notice shown when the
// safety check stops something, and the Report / Block menu.

import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { BLUE, initials } from '../lib/community';
import { colors, radius, spacing } from '../constants/theme';

export function Chips<T extends string>({ options, value, onChange }: { options: Array<{ key: T; label: string; off?: boolean }>; value: T | null; onChange: (key: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {options.filter((o) => !o.off).map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={[styles.chip, on && { backgroundColor: BLUE, borderColor: BLUE }]}>
            <Text style={[styles.chipText, on && { color: '#04091A' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Avatar({ name, size = 44, tint = BLUE }: { name: string; size?: number; tint?: string }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#04091A', fontWeight: '800', fontSize: size * 0.36 }}>{initials(name)}</Text>
    </View>
  );
}

/** Shown when a post, reply or message was stopped by the safety check. */
export function Stopped({ tell, onClose }: { tell: string; onClose: () => void }) {
  return (
    <View style={styles.stopped} accessibilityRole="alert">
      <Ionicons name="shield-outline" size={18} color={colors.danger} />
      <Text style={styles.stoppedText}>{tell}</Text>
      <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss"><Ionicons name="close" size={18} color={colors.textMuted as string} /></Pressable>
    </View>
  );
}

/** Report something to ClubPulse, or block the person behind it. */
export function safetyMenu(kind: 'post' | 'comment' | 'message' | 'profile', targetId: string, person: { id: string; name: string }, after?: () => void) {
  const send = async (body: Record<string, unknown>, done: string) => {
    try { await api('/api/community/safety', { method: 'POST', body }); Alert.alert(done); after?.(); }
    catch (e) { Alert.alert('That did not work', e instanceof Error ? e.message : 'Try again.'); }
  };
  Alert.alert(person.name, undefined, [
    { text: 'Report to ClubPulse', onPress: () => send({ action: 'report', kind, targetId }, 'Reported. ClubPulse will look at it.') },
    { text: `Block ${person.name}`, style: 'destructive', onPress: () => send({ action: 'block', userId: person.id }, `${person.name} is blocked. You will not see each other.`) },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

const styles = StyleSheet.create({
  chips: { gap: spacing.sm, paddingRight: spacing.lg },
  chip: { paddingHorizontal: 14, minHeight: 36, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.06)' },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  stopped: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(248,113,113,0.4)', backgroundColor: 'rgba(248,113,113,0.10)' },
  stoppedText: { flex: 1, fontSize: 13.5, lineHeight: 19, color: colors.text },
});

// Partnerships: cricket people around you, one at a time. (Named after a batting partnership.) Say what you are looking for, then Connect or
// Not now. Two yeses make a connection, and only then can you message each other. Juniors are
// shown other juniors, adults are shown adults.

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { BLUE, LOOKING_FOR, SCOPES, lookingLabel, type LookingFor, type NearbyPerson, type Scope } from '../../lib/community';
import { Avatar, Chips } from '../../components/CommunityBits';
import { colors, display, fonts, radius, spacing } from '../../constants/theme';

export default function NearbyScreen() {
  const router = useRouter();
  const [scope, setScope] = useState<Scope>('miles');
  const [want, setWant] = useState<LookingFor | null>(null);
  const [people, setPeople] = useState<NearbyPerson[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setPeople(null);
    try {
      const r = await api<{ people: NearbyPerson[] }>(`/api/community/nearby?scope=${scope}${want ? `&want=${want}` : ''}`);
      setPeople(r.people); setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load people.'); setPeople([]); }
  }, [scope, want]);
  useEffect(() => { load(); }, [load]);

  const person = people?.[0];

  const answer = async (yes: boolean) => {
    if (!person || busy) return;
    setBusy(true); setNote(null);
    try {
      const r = await api<{ link: 'requested' | 'connected' | 'passed' }>('/api/community/connections', { method: 'POST', body: { userId: person.id, yes } });
      if (r.link === 'connected') setNote(`You and ${person.name} are connected. Find them in My Squad.`);
      else if (r.link === 'requested') setNote(`Sent. You will be connected if ${person.name} says yes too.`);
      setPeople((list) => (list ?? []).slice(1));
    } catch (e) { setNote(e instanceof Error ? e.message : 'That did not work.'); }
    setBusy(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={fonts.small}>Looking for</Text>
        <Chips value={want} onChange={(k) => setWant(want === k ? null : k)} options={LOOKING_FOR} />
        <Text style={fonts.small}>Where</Text>
        <Chips value={scope} onChange={setScope} options={SCOPES} />

        {note && <Text style={styles.note} accessibilityRole="alert">{note}</Text>}
        {error && <Text style={[fonts.small, { color: colors.danger }]}>{error}</Text>}
        {!people && <ActivityIndicator color={BLUE} style={{ marginTop: spacing.xl }} />}

        {people && !person && (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={40} color={BLUE} />
            <Text style={styles.emptyTitle}>That is everyone for now</Text>
            <Text style={[fonts.small, { textAlign: 'center' }]}>Try a wider area, or fill in your Scorecard so others can find you.</Text>
            <Pressable onPress={() => router.push('/community/profile')} accessibilityRole="button" style={styles.ghost}><Text style={styles.ghostText}>Open My Scorecard</Text></Pressable>
          </View>
        )}

        {person && (
          <>
            <View style={styles.card}>
              <View style={styles.photo}><Avatar name={person.name} size={120} tint="#93C5FD" /></View>
              <Text style={styles.name}>{person.name}</Text>
              <Text style={fonts.small}>{[person.roles.map((r) => r[0].toUpperCase() + r.slice(1)).join(' and '), person.club, person.distance].filter(Boolean).join(' · ')}</Text>
              {!!person.headline && <Text style={styles.headline}>{person.headline}</Text>}
              <View style={styles.tags}>
                {person.openToClub && <View style={[styles.tag, { backgroundColor: BLUE }]}><Text style={[styles.tagText, { color: '#04091A' }]}>Open to a new club</Text></View>}
                {person.lookingFor.map((k) => <View key={k} style={styles.tag}><Text style={styles.tagText}>{lookingLabel(k)}</Text></View>)}
              </View>
              <Pressable onPress={() => router.push({ pathname: '/community/profile', params: { id: person.id } })} accessibilityRole="button"><Text style={styles.link}>See full profile</Text></Pressable>
            </View>
            <View style={styles.buttons}>
              <Pressable onPress={() => answer(false)} disabled={busy} accessibilityRole="button" style={[styles.btn, styles.btnGhost]}>
                <Ionicons name="close" size={20} color={colors.white} /><Text style={styles.btnGhostText}>Not now</Text>
              </Pressable>
              <Pressable onPress={() => answer(true)} disabled={busy} accessibilityRole="button" style={[styles.btn, { backgroundColor: BLUE }]}>
                <Ionicons name="checkmark" size={20} color="#04091A" /><Text style={styles.btnText}>Connect</Text>
              </Pressable>
            </View>
            <Text style={[fonts.small, { textAlign: 'center' }]}>Distance is rough and club to club. Nobody sees where you are.</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  note: { fontSize: 14, lineHeight: 20, color: colors.white, backgroundColor: 'rgba(96,165,250,0.14)', borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(96,165,250,0.4)', padding: spacing.md },
  card: { backgroundColor: colors.navyLight, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.sm },
  photo: { height: 200, borderRadius: radius.lg, backgroundColor: '#111D42', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  name: { fontFamily: display.heavy, fontSize: 24, color: colors.white },
  headline: { fontSize: 15, lineHeight: 22, color: colors.text },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.08)' },
  tagText: { fontSize: 13, fontWeight: '600', color: colors.text },
  link: { fontSize: 14, fontWeight: '600', color: BLUE, paddingVertical: 6 },
  buttons: { flexDirection: 'row', gap: spacing.md },
  btn: { flex: 1, minHeight: 52, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnText: { color: '#04091A', fontWeight: '800', fontSize: 16 },
  btnGhost: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  btnGhostText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  emptyTitle: { fontFamily: display.heavy, fontSize: 20, color: colors.white },
  ghost: { marginTop: spacing.sm, borderWidth: 1, borderColor: BLUE, borderRadius: radius.pill, paddingHorizontal: 20, minHeight: 44, justifyContent: 'center' },
  ghostText: { color: BLUE, fontWeight: '700' },
});

// Clubs near you: public club cards with their headline and nets notes. Tap one for the full club page on
// the website; follow it from there.

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { BLUE, SCOPES, WITHIN, type ClubCard, type Scope } from '../../lib/community';
import { Chips } from '../../components/CommunityBits';
import { colors, display, fonts, radius, spacing } from '../../constants/theme';

export default function ClubsNearbyScreen() {
  const [scope, setScope] = useState<Scope>('miles');
  const [within, setWithin] = useState<'5' | '10' | '25' | null>(null);
  const [clubs, setClubs] = useState<ClubCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setClubs(null);
    try { setClubs((await api<{ clubs: ClubCard[] }>(`/api/community/clubs?scope=${scope}${within ? `&within=${within}` : ''}`)).clubs); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load clubs.'); setClubs([]); }
  }, [scope, within]);
  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={fonts.small}>Where</Text>
        <Chips value={scope} onChange={setScope} options={SCOPES} />
        <Text style={fonts.small}>Within</Text>
        <Chips value={within} onChange={(k) => setWithin(within === k ? null : k)} options={WITHIN} />
        {error && <Text style={[fonts.small, { color: colors.danger }]}>{error}</Text>}
        {!clubs && <ActivityIndicator color={BLUE} style={{ marginTop: spacing.xl }} />}
        {clubs && clubs.length === 0 && !error && <Text style={[fonts.small, { textAlign: 'center', marginTop: spacing.xl }]}>No other clubs in this area yet. Try a wider one.</Text>}
        {clubs?.map((c) => (
          <View key={c.id} style={styles.card}>
            <Text style={styles.name}>{c.name}</Text>
            <Text style={fonts.small}>{[c.county, c.league, c.distance].filter(Boolean).join(' · ')}</Text>
            {!!c.headline && <Text style={styles.body}>{c.headline}</Text>}
            {!!c.netsNotes && <Text style={fonts.small}>Nets: {c.netsNotes}</Text>}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.navyLight, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.xs },
  name: { fontFamily: display.heavy, fontSize: 20, color: colors.white },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
});

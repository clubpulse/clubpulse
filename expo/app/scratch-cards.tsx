// Scratch cards the player has earned. Cards are never bought: they come from a seven-day check-in
// streak, tasks the club chooses to reward, a Scores milestone, or an award from the club. The draw is made on the server when a
// card is opened; this screen only shows the result. Over-18s only, and never for junior accounts.

import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '../lib/api';
import { colors, display, fonts, radius, spacing } from '../constants/theme';

type Waiting = { id: string; source: string; earned_at: string };
type Opened = { id: string; label: string; type: string; opened_at: string; pending: boolean; code: string | null };
type Cards = {
  unavailable: string | null;
  gate: 'junior' | 'confirm' | null;
  waiting: Waiting[];
  opened: Opened[];
  prizes: Array<{ label: string; chance: number }>;
  milestone: number | null;
  tasks?: string[];
};
type Prize = {
  type: string;
  label: string;
  scores_amount?: number;
  club_reward?: string;
  voucher?: { token: string | null; instructions: string | null } | null;
  pending?: boolean;
};

function prizeLines(p: Prize): { icon: string; title: string; detail: string } {
  switch (p.type) {
    case 'scores':
      return { icon: '⭐', title: p.label, detail: `${(p.scores_amount ?? 0).toLocaleString('en-GB')} Scores have been added to your balance.` };
    case 'gift_card':
      return p.voucher?.token
        ? { icon: '🎁', title: p.label, detail: `Your code: ${p.voucher.token}` }
        : { icon: '🎁', title: p.label, detail: 'We will email your gift card to you. This can take a few days.' };
    case 'club_reward':
      return { icon: '🏏', title: p.label, detail: p.club_reward ? `${p.club_reward}. Claim it at the club.` : 'Claim it at the club.' };
    case 'try_again':
      return { icon: '🙂', title: 'No prize this time', detail: 'Keep going: your next card is not far away.' };
    default:
      return { icon: '🎉', title: p.label, detail: '' };
  }
}

const day = (iso: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '');

export default function ScratchCardsScreen() {
  const [data, setData] = useState<Cards | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [ticked, setTicked] = useState(false);
  const [prize, setPrize] = useState<Prize | null>(null);
  const pop = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      setData(await api<Cards>('/api/scratch-cards'));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load your scratch cards.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const confirmAge = async () => {
    setBusy('age');
    try {
      await api('/api/scratch-cards/confirm-age', { method: 'POST' });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save. Please try again.');
    }
    setBusy(null);
  };

  const open = async (card: Waiting) => {
    setBusy(card.id);
    setError(null);
    try {
      const res = await api<{ prize: Prize }>('/api/scratch-cards/reveal', { method: 'POST', body: { cardId: card.id } });
      setPrize(res.prize);
      pop.setValue(0);
      Animated.timing(pop, { toValue: 1, duration: 450, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }).start();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not open this card.');
    }
    await load();
    setBusy(null);
  };

  const shown = prize ? prizeLines(prize) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.gold} />}
      >
        {!data && !error && <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xxl }} />}

        {error && (
          <View style={[styles.card, { borderColor: colors.danger }]}>
            <Text style={fonts.regular}>{error}</Text>
          </View>
        )}

        {shown && (
          <Animated.View
            style={[styles.card, styles.prizeCard, { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }]}
          >
            <Text style={styles.prizeIcon}>{shown.icon}</Text>
            <Text style={styles.prizeTitle}>{shown.title}</Text>
            {!!shown.detail && <Text style={[fonts.regular, { textAlign: 'center', marginTop: 6 }]} selectable>{shown.detail}</Text>}
            <Pressable onPress={() => setPrize(null)} style={styles.outlineBtn}>
              <Text style={styles.outlineBtnText}>Done</Text>
            </Pressable>
          </Animated.View>
        )}

        {data?.unavailable && (
          <View style={styles.card}>
            <Text style={fonts.regular}>{data.unavailable}</Text>
          </View>
        )}

        {data && !data.unavailable && data.gate === 'junior' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Junior account</Text>
            <Text style={fonts.regular}>
              Scratch cards are switched off for junior accounts. Everything else you earn is still yours.
            </Text>
          </View>
        )}

        {data && !data.unavailable && data.gate === 'confirm' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Confirm your age</Text>
            <Text style={fonts.regular}>Scratch cards are for players aged 18 or over.</Text>
            <Pressable onPress={() => setTicked((t) => !t)} style={styles.tickRow} accessibilityRole="checkbox" accessibilityState={{ checked: ticked }}>
              <Ionicons name={ticked ? 'checkbox' : 'square-outline'} size={22} color={ticked ? colors.gold : colors.textSubtle} />
              <Text style={[fonts.regular, { flex: 1 }]}>I confirm that I am 18 or over.</Text>
            </Pressable>
            <Pressable onPress={confirmAge} disabled={!ticked || busy !== null} style={[styles.goldBtn, !ticked && { opacity: 0.4 }]}>
              {busy === 'age' ? <ActivityIndicator color={colors.background} /> : <Text style={styles.goldBtnText}>Confirm</Text>}
            </Pressable>
          </View>
        )}

        {data && !data.unavailable && data.gate === null && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cards to open ({data.waiting.length})</Text>
            {data.waiting.length === 0 ? (
              <Text style={fonts.regular}>You have no cards to open. Here is how to earn one.</Text>
            ) : (
              data.waiting.map((c) => (
                <View key={c.id} style={styles.row}>
                  <Text style={styles.rowIcon}>🎟️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{c.source}</Text>
                    <Text style={fonts.small}>Earned {day(c.earned_at)}</Text>
                  </View>
                  <Pressable onPress={() => open(c)} disabled={busy !== null} style={styles.goldBtnSmall}>
                    {busy === c.id ? <ActivityIndicator color={colors.background} /> : <Text style={styles.goldBtnText}>Scratch</Text>}
                  </Pressable>
                </View>
              ))
            )}
          </View>
        )}

        {data && !data.unavailable && data.gate !== 'junior' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>How to earn a card</Text>
            <Text style={fonts.regular}>• Check in seven days in a row: day seven is a card.</Text>
            {data.milestone ? (
              <Text style={[fonts.regular, { marginTop: 4 }]}>• Every {data.milestone.toLocaleString('en-GB')} Scores you earn brings another card.</Text>
            ) : null}
            {(data.tasks ?? []).map((line) => (
              <Text key={line} style={[fonts.regular, { marginTop: 4 }]}>• {line}</Text>
            ))}
            <Text style={[fonts.regular, { marginTop: 4 }]}>• Your club can award one for something done well.</Text>
            <Text style={[fonts.small, { marginTop: spacing.sm }]}>Cards are earned, never bought. They cost no Scores and no money.</Text>
          </View>
        )}

        {data && !data.unavailable && data.prizes.length > 0 && data.gate !== 'junior' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What a card can hold</Text>
            {data.prizes.map((p) => (
              <View key={p.label} style={styles.chanceRow}>
                <Text style={[fonts.regular, { flex: 1 }]}>{p.label}</Text>
                <Text style={styles.chance}>{p.chance}%</Text>
              </View>
            ))}
            <Text style={[fonts.small, { marginTop: spacing.sm }]}>The chance of each prize, set by your club.</Text>
          </View>
        )}

        {data && data.opened.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recently opened</Text>
            {data.opened.map((c) => (
              <View key={c.id} style={styles.chanceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={fonts.regular}>{c.type === 'try_again' ? 'No prize' : c.label}</Text>
                  <Text style={fonts.small} selectable>
                    {day(c.opened_at)}
                    {c.code ? ` · Code: ${c.code}` : c.pending ? ' · On its way' : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
        {/* Always shown, whatever the state above: Apple requires the rules to be reachable at all times */}
        <View style={styles.card}>
          <Text style={fonts.small}>
            Scratch cards are a free prize draw run by ShiftUp for members aged 18 or over. Apple is not a sponsor and is not
            involved in any way.
          </Text>
          <Pressable onPress={() => router.push('/scratch-rules' as never)} style={styles.outlineBtn} accessibilityRole="link">
            <Text style={[styles.outlineBtnText, { textAlign: 'center' }]}>Read the official rules</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.navyBorder, padding: spacing.lg },
  cardTitle: { color: colors.white, fontSize: 16, fontWeight: '800', marginBottom: spacing.sm },
  prizeCard: { alignItems: 'center', borderColor: colors.gold },
  prizeIcon: { fontSize: 48 },
  prizeTitle: { color: colors.gold, fontFamily: display.heavy, fontSize: 20, textAlign: 'center', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  rowIcon: { fontSize: 26, width: 32, textAlign: 'center' },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  tickRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  goldBtn: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', marginTop: spacing.md },
  goldBtnSmall: { backgroundColor: colors.gold, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 9, minWidth: 92, alignItems: 'center' },
  goldBtnText: { color: colors.background, fontSize: 14, fontWeight: '800' },
  outlineBtn: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.navyBorder, paddingVertical: 10, paddingHorizontal: 28, marginTop: spacing.md },
  outlineBtnText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  chanceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 6 },
  chance: { color: colors.brandSky, fontSize: 15, fontWeight: '800' },
});

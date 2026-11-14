import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SubNav } from '../../components/SubNav';
import { Card } from '../../components/Card';
import { colors, fonts, radius, spacing } from '../../constants/theme';

const TABS = [
  { key: 'fantasy', label: 'Fantasy XI' },
  { key: 'games', label: 'Games' },
  { key: 'scratch', label: 'Scratch Cards' },
  { key: 'leaderboard', label: 'Leaderboard' },
];

// ── Fantasy XI ──
function FantasyView() {
  const squad = [
    { name: 'R. Sharma', role: 'Batsman', pts: 58, isCaptain: true },
    { name: 'K. Menon', role: 'All-rounder', pts: 44 },
    { name: 'A. Patel', role: 'Batsman', pts: 37 },
    { name: 'Ishwar Suresh', role: 'All-rounder', pts: 28, isUser: true },
    { name: 'D. Wilson', role: 'Bowler', pts: 22 },
  ];

  return (
    <View style={{ gap: spacing.lg }}>
      <Card style={{ borderColor: 'rgba(201,168,76,0.3)', borderWidth: 1, alignItems: 'center' }}>
        <Text style={fonts.small}>YOUR TOTAL</Text>
        <Text style={[fonts.big, { color: colors.gold }]}>189</Text>
        <Text style={fonts.small}>Gameweek 22 · Rank #3</Text>
      </Card>

      <Text style={fonts.title}>Your XI</Text>
      {squad.map((p, i) => (
        <Card key={i} style={{ paddingVertical: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[fonts.regular, p.isUser && { color: colors.gold }]}>{p.name}</Text>
                {p.isCaptain && (
                  <View style={[styles.badge, { backgroundColor: 'rgba(201,168,76,0.15)' }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.gold }}>C</Text>
                  </View>
                )}
              </View>
              <Text style={fonts.small}>{p.role}</Text>
            </View>
            <Text style={[fonts.title, { fontSize: 20 }]}>{p.pts}</Text>
          </View>
        </Card>
      ))}

      <Pressable style={styles.primaryBtn}>
        <Text style={styles.primaryBtnText}>Edit team</Text>
      </Pressable>
    </View>
  );
}

// ── Games ──
function GamesView() {
  const games = [
    { name: 'Cricket Trivia', desc: 'Test your cricket knowledge', icon: '🧠', scores: 50 },
    { name: 'Predict the Score', desc: 'Guess the final total to win', icon: '🎯', scores: 100 },
    { name: 'Fastest Finger', desc: 'Tap to answer before time runs out', icon: '⚡', scores: 30 },
    { name: 'Shot Challenge', desc: 'Name the shot from the clip', icon: '🏏', scores: 40 },
  ];

  return (
    <View style={{ gap: spacing.md }}>
      <Card style={{ borderColor: 'rgba(201,168,76,0.2)', borderWidth: 1 }}>
        <Text style={fonts.small}>🎮 Play games to earn Scores. New games added weekly.</Text>
      </Card>
      {games.map((g, i) => (
        <Card key={i}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={styles.gameIcon}>
              <Text style={{ fontSize: 28 }}>{g.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={fonts.regular}>{g.name}</Text>
              <Text style={fonts.small}>{g.desc}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: colors.gold, fontWeight: '700', fontSize: 14 }}>+{g.scores}</Text>
              <Text style={[fonts.small, { fontSize: 10 }]}>Scores</Text>
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

// ── Scratch Cards ──
function ScratchView() {
  const [scratched, setScratched] = useState(false);

  return (
    <View style={{ gap: spacing.lg }}>
      <Card style={{ alignItems: 'center', gap: spacing.md }}>
        <Text style={fonts.title}>🎫 Scratch & Win</Text>
        <Text style={[fonts.small, { textAlign: 'center' }]}>
          Scratch the card to reveal your prize. Costs 500 Scores per card.
        </Text>
        <Pressable
          onPress={() => setScratched(true)}
          style={[styles.scratchCard, scratched && styles.scratchRevealed]}
        >
          {scratched ? (
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 40 }}>🎉</Text>
              <Text style={[fonts.title, { color: colors.gold }]}>15% off Nike!</Text>
              <Text style={fonts.small}>Use code: CLUBPULSE15</Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 40 }}>🎫</Text>
              <Text style={fonts.regular}>Tap to scratch</Text>
              <Text style={fonts.small}>Costs 500 Scores</Text>
            </View>
          )}
        </Pressable>
        {scratched && (
          <Pressable onPress={() => setScratched(false)} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Play again</Text>
          </Pressable>
        )}
      </Card>

      <Card>
        <Text style={fonts.title}>Your prizes</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <View style={styles.prizeRow}>
            <Text style={fonts.regular}>10% off JD Sports</Text>
            <Text style={fonts.small}>Won 8 Nov</Text>
          </View>
          <View style={styles.prizeRow}>
            <Text style={fonts.regular}>Free Costa coffee</Text>
            <Text style={fonts.small}>Won 2 Nov</Text>
          </View>
        </View>
      </Card>
    </View>
  );
}

// ── Leaderboard ──
function LeaderboardView() {
  const leaders = [
    { rank: 1, name: 'R. Sharma', scores: 12480, trend: 'up' },
    { rank: 2, name: 'K. Menon', scores: 9250, trend: 'up' },
    { rank: 3, name: 'Ishwar Suresh', scores: 4850, trend: 'same', isUser: true },
    { rank: 4, name: 'A. Patel', scores: 3900, trend: 'down' },
    { rank: 5, name: 'D. Wilson', scores: 3210, trend: 'up' },
    { rank: 6, name: 'M. Hassan', scores: 2800, trend: 'down' },
    { rank: 7, name: 'T. Carter', scores: 2100, trend: 'same' },
    { rank: 8, name: 'J. Singh', scores: 1650, trend: 'up' },
  ];

  return (
    <View style={{ gap: spacing.md }}>
      {leaders.map((l) => (
        <Card key={l.rank} style={[
          { paddingVertical: spacing.sm },
          l.isUser && { borderColor: 'rgba(201,168,76,0.3)', borderWidth: 1 },
        ]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Text style={[fonts.title, { width: 30, textAlign: 'center', color: l.rank <= 3 ? colors.gold : colors.textMuted }]}>
              #{l.rank}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={[fonts.regular, l.isUser && { color: colors.gold }]}>{l.name}</Text>
            </View>
            <Ionicons
              name={l.trend === 'up' ? 'arrow-up' : l.trend === 'down' ? 'arrow-down' : 'remove'}
              size={14}
              color={l.trend === 'up' ? colors.success : l.trend === 'down' ? colors.danger : colors.textMuted}
            />
            <Text style={[fonts.title, { minWidth: 60, textAlign: 'right' }]}>
              {l.scores.toLocaleString()}
            </Text>
          </View>
        </Card>
      ))}
    </View>
  );
}

// ── Main ──
export default function PlayScreen() {
  const [tab, setTab] = useState('fantasy');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={fonts.heading}>Play</Text>
        <SubNav tabs={TABS} active={tab} onChange={setTab} />
        {tab === 'fantasy' && <FantasyView />}
        {tab === 'games' && <GamesView />}
        {tab === 'scratch' && <ScratchView />}
        {tab === 'leaderboard' && <LeaderboardView />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  content: { padding: spacing.lg, gap: spacing.lg },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm },
  primaryBtn: { backgroundColor: colors.gold, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center' },
  primaryBtnText: { color: colors.navy, fontWeight: '700', fontSize: 15 },
  secondaryBtn: { borderWidth: 1, borderColor: colors.navyBorder, paddingVertical: 12, paddingHorizontal: 20, borderRadius: radius.md },
  secondaryBtnText: { color: colors.text, fontWeight: '600', fontSize: 14 },
  gameIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.navyLight, alignItems: 'center', justifyContent: 'center' },
  scratchCard: {
    width: '100%', aspectRatio: 1.6, borderRadius: radius.lg,
    backgroundColor: colors.navyLight, borderWidth: 1, borderColor: colors.navyBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  scratchRevealed: { backgroundColor: 'rgba(201,168,76,0.08)', borderColor: 'rgba(201,168,76,0.3)' },
  prizeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
});

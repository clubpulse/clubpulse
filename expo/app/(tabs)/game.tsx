import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SubNav } from '../../components/SubNav';
import { Card } from '../../components/Card';
import { colors, fonts, radius, spacing } from '../../constants/theme';

const TABS = [
  { key: 'coach', label: 'AI Coach' },
  { key: 'stats', label: 'Stats' },
  { key: 'levels', label: 'Levels' },
];

// ── AI Coach ──
function CoachView() {
  return (
    <View style={{ gap: spacing.lg }}>
      <Card style={{ borderColor: 'rgba(201,168,76,0.3)', borderWidth: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
          <Text style={{ fontSize: 24 }}>🤖</Text>
          <Text style={fonts.title}>AI Performance Summary</Text>
        </View>
        <Text style={fonts.regular}>
          Based on your last 5 innings, your scoring rate against pace is strong (SR 82.4) but you're getting out
          to spin in the 15-25 over range. Consider practicing sweep shots against off-spin.
        </Text>
      </Card>

      <Text style={fonts.title}>Key metrics</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Text style={fonts.small}>TECH SCORE</Text>
          <Text style={[fonts.big, { fontSize: 32, color: colors.success }]}>74</Text>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Text style={fonts.small}>CONSISTENCY</Text>
          <Text style={[fonts.big, { fontSize: 32, color: colors.gold }]}>68</Text>
        </Card>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Text style={fonts.small}>SHOT RANGE</Text>
          <Text style={[fonts.big, { fontSize: 32 }]}>7/12</Text>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Text style={fonts.small}>FITNESS</Text>
          <Text style={[fonts.big, { fontSize: 32, color: '#60A5FA' }]}>81</Text>
        </Card>
      </View>

      <Card>
        <Text style={fonts.title}>Drills for you</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          {[
            { name: 'Sweep against off-spin', duration: '15 min', priority: 'High' },
            { name: 'Running between wickets', duration: '10 min', priority: 'Medium' },
            { name: 'Death bowling yorkers', duration: '20 min', priority: 'Medium' },
          ].map((d, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs }}>
              <View>
                <Text style={fonts.regular}>{d.name}</Text>
                <Text style={fonts.small}>{d.duration}</Text>
              </View>
              <View style={[styles.badge, {
                backgroundColor: d.priority === 'High' ? 'rgba(248,113,113,0.15)' : 'rgba(201,168,76,0.15)',
              }]}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: d.priority === 'High' ? colors.danger : colors.gold }}>
                  {d.priority}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}

// ── Stats ──
function StatsView() {
  const stats = [
    { label: 'Matches', value: '18' },
    { label: 'Runs scored', value: '691' },
    { label: 'Highest score', value: '87*', highlight: true },
    { label: 'Batting avg', value: '38.4' },
    { label: 'Wickets', value: '14' },
    { label: 'Best bowling', value: '3/28', highlight: true },
    { label: 'Economy', value: '4.8' },
    { label: 'Catches', value: '9' },
    { label: 'Run outs', value: '3' },
    { label: 'Stumpings', value: '0' },
  ];

  return (
    <View style={{ gap: spacing.lg }}>
      <Text style={fonts.title}>Season 2026</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {stats.map((s, i) => (
          <Card key={i} style={{ width: '48%', alignItems: 'center', paddingVertical: spacing.md }}>
            <Text style={[fonts.small, { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }]}>{s.label}</Text>
            <Text style={[fonts.big, { fontSize: 24, color: s.highlight ? colors.gold : colors.white }]}>{s.value}</Text>
          </Card>
        ))}
      </View>
    </View>
  );
}

// ── Levels ──
function LevelsView() {
  const levels = [
    { level: 1, name: 'Newcomer', from: 0, to: 500, color: colors.textMuted },
    { level: 2, name: 'Regular', from: 500, to: 1500, color: '#60A5FA' },
    { level: 3, name: 'Pro', from: 1500, to: 3000, color: colors.success },
    { level: 4, name: 'Elite', from: 3000, to: 6000, color: '#A78BFA' },
    { level: 5, name: 'Legend', from: 6000, to: 10000, color: colors.gold },
    { level: 6, name: 'Hall of Fame', from: 10000, to: 999999, color: '#F87171' },
  ];
  const currentScores = 4850;
  const currentLevel = levels.find(l => currentScores >= l.from && currentScores < l.to) || levels[0];
  const progress = (currentScores - currentLevel.from) / (currentLevel.to - currentLevel.from);

  return (
    <View style={{ gap: spacing.lg }}>
      <Card style={{ alignItems: 'center', gap: spacing.sm, borderColor: 'rgba(201,168,76,0.3)', borderWidth: 1 }}>
        <Text style={fonts.small}>CURRENT LEVEL</Text>
        <Text style={[fonts.big, { color: currentLevel.color }]}>{currentLevel.name}</Text>
        <Text style={fonts.small}>{currentScores.toLocaleString()} / {currentLevel.to.toLocaleString()} Scores</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: currentLevel.color }]} />
        </View>
        <Text style={fonts.small}>{(currentLevel.to - currentScores).toLocaleString()} Scores to next level</Text>
      </Card>

      <Text style={fonts.title}>All levels</Text>
      {levels.map((l) => {
        const reached = currentScores >= l.from;
        return (
          <Card key={l.level} style={[
            { paddingVertical: spacing.sm },
            l.level === currentLevel.level && { borderColor: l.color + '4D', borderWidth: 1 },
          ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={[styles.levelBadge, { backgroundColor: reached ? l.color + '26' : 'rgba(255,255,255,0.03)' }]}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: reached ? l.color : colors.textMuted }}>{l.level}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[fonts.regular, { color: reached ? colors.white : colors.textMuted }]}>{l.name}</Text>
                <Text style={fonts.small}>{l.from.toLocaleString()}+ Scores</Text>
              </View>
              {reached && <Text style={{ color: colors.success, fontSize: 16 }}>✓</Text>}
            </View>
          </Card>
        );
      })}
    </View>
  );
}

// ── Main ──
export default function GameScreen() {
  const [tab, setTab] = useState('coach');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={fonts.heading}>My Game</Text>
        <SubNav tabs={TABS} active={tab} onChange={setTab} />
        {tab === 'coach' && <CoachView />}
        {tab === 'stats' && <StatsView />}
        {tab === 'levels' && <LevelsView />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  content: { padding: spacing.lg, gap: spacing.lg },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm },
  progressBar: { width: '100%', height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  levelBadge: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});

import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SubNav } from '../../components/SubNav';
import { Card } from '../../components/Card';
import { colors, fonts, radius, spacing } from '../../constants/theme';
import { DEMO_MODE } from '../../lib/supabase';

const TABS = [
  { key: 'report', label: 'Report' },
  { key: 'my_reports', label: 'My Reports' },
  { key: 'leaderboard', label: 'Leaderboard' },
];

type ReportCategory = {
  key: string;
  icon: string;
  label: string;
  desc: string;
  scores: number;
};

const CATEGORIES: ReportCategory[] = [
  { key: 'pitch', icon: '🏏', label: 'Pitch & Outfield', desc: 'Damage, waterlogging, unsafe areas on the playing surface', scores: 25 },
  { key: 'equipment', icon: '🔧', label: 'Equipment', desc: 'Broken nets, damaged sightscreens, faulty scoreboards', scores: 20 },
  { key: 'facilities', icon: '🏗️', label: 'Facilities', desc: 'Clubhouse, pavilion, changing rooms, toilets', scores: 20 },
  { key: 'safety', icon: '⚠️', label: 'Safety Hazard', desc: 'Unsafe surfaces, exposed wiring, broken glass', scores: 40 },
  { key: 'cleanliness', icon: '🧹', label: 'Cleanliness', desc: 'Litter, overflowing bins, unkept areas', scores: 15 },
  { key: 'vandalism', icon: '🚨', label: 'Vandalism', desc: 'Graffiti, intentional damage, theft', scores: 50 },
  { key: 'improvement', icon: '💡', label: 'Improvement Idea', desc: 'Suggest upgrades or new facilities', scores: 10 },
  { key: 'positive', icon: '🌟', label: 'Positive Spot', desc: 'Highlight something great about the ground', scores: 10 },
];

// ── Report View ──
function ReportView() {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!selected) {
      Alert.alert('Select a category', 'Choose what you want to report before submitting.');
      return;
    }
    // In production: open camera → upload photo → POST to /api/clubwatch/submit
    // For now, show demo flow
    Alert.alert(
      '📸 Take a Photo',
      'In the full version, your camera opens here. You snap the issue, add a note, and submit.\n\nFor now, this simulates a successful submission.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Simulate Submit',
          onPress: () => {
            setSubmitted(true);
            setTimeout(() => setSubmitted(false), 4000);
          },
        },
      ],
    );
  };

  const cat = CATEGORIES.find((c) => c.key === selected);

  return (
    <View style={{ gap: spacing.lg }}>
      {/* Hero card */}
      <Card style={{ borderColor: 'rgba(201,168,76,0.25)', borderWidth: 1, alignItems: 'center', gap: spacing.sm }}>
        <Text style={{ fontSize: 40 }}>📸</Text>
        <Text style={fonts.title}>Snap. Report. Earn.</Text>
        <Text style={[fonts.small, { textAlign: 'center' }]}>
          Spot an issue at the ground? Take a photo, choose a category, and earn Scores when it's verified by your club.
        </Text>
      </Card>

      {/* How it works */}
      <Card style={{ gap: spacing.sm }}>
        <Text style={fonts.title}>How it works</Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={styles.stepCircle}><Text style={styles.stepNum}>1</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={fonts.regular}>Spot something</Text>
            <Text style={fonts.small}>See a problem or something noteworthy at the ground</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={styles.stepCircle}><Text style={styles.stepNum}>2</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={fonts.regular}>Snap & categorise</Text>
            <Text style={fonts.small}>Take a photo and pick the right category below</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={styles.stepCircle}><Text style={styles.stepNum}>3</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={fonts.regular}>Earn Scores</Text>
            <Text style={fonts.small}>Your club committee reviews it and you get rewarded</Text>
          </View>
        </View>
      </Card>

      {/* Category selection */}
      <Text style={fonts.title}>What are you reporting?</Text>
      <View style={{ gap: spacing.sm }}>
        {CATEGORIES.map((c) => {
          const isSelected = selected === c.key;
          return (
            <Pressable key={c.key} onPress={() => setSelected(c.key)}>
              <Card
                style={[
                  { paddingVertical: spacing.md },
                  isSelected && { borderColor: colors.gold, borderWidth: 2 },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <View style={styles.catIcon}>
                    <Text style={{ fontSize: 24 }}>{c.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={fonts.regular}>{c.label}</Text>
                    <Text style={[fonts.small, { fontSize: 12 }]}>{c.desc}</Text>
                  </View>
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreText}>+{c.scores}</Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>

      {/* Submit button */}
      <Pressable
        style={[styles.submitBtn, !selected && { opacity: 0.4 }]}
        onPress={handleSubmit}
        disabled={!selected}
      >
        <Text style={styles.submitText}>
          📸 Take Photo & Submit{cat ? ` (+${cat.scores} Scores)` : ''}
        </Text>
      </Pressable>

      {/* Success banner */}
      {submitted && (
        <Card style={{ backgroundColor: 'rgba(52,211,153,0.1)', borderColor: colors.success, borderWidth: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 28 }}>✅</Text>
          <Text style={[fonts.title, { color: colors.success }]}>Report submitted!</Text>
          <Text style={[fonts.small, { textAlign: 'center' }]}>
            Your club committee will review it. You'll earn {cat?.scores ?? 0} Scores when verified.
          </Text>
        </Card>
      )}

      {/* Location note */}
      <Card style={{ gap: spacing.xs }}>
        <Text style={[fonts.small, { fontSize: 11 }]}>
          📍 Reports are GPS-tagged to confirm you're at or near the ground. Location access is required.
        </Text>
      </Card>
    </View>
  );
}

// ── My Reports View ──
function MyReportsView() {
  const reports = DEMO_MODE
    ? [
        { id: 1, category: 'safety', status: 'verified', date: '10 Nov', scores: 40, note: 'Loose paving slab near pavilion entrance' },
        { id: 2, category: 'cleanliness', status: 'verified', date: '8 Nov', scores: 15, note: 'Overflowing bins by the car park' },
        { id: 3, category: 'equipment', status: 'pending', date: '7 Nov', scores: 0, note: 'Net 3 has a large tear in the side panel' },
        { id: 4, category: 'pitch', status: 'verified', date: '2 Nov', scores: 25, note: 'Waterlogged area near square leg' },
        { id: 5, category: 'positive', status: 'verified', date: '28 Oct', scores: 10, note: 'New flower beds look brilliant' },
        { id: 6, category: 'improvement', status: 'rejected', date: '25 Oct', scores: 0, note: 'Could we add a bike rack near the entrance?' },
      ]
    : [];

  const statusColor = (s: string) =>
    s === 'verified' ? colors.success : s === 'pending' ? colors.gold : colors.danger;
  const statusLabel = (s: string) =>
    s === 'verified' ? '✅ Verified' : s === 'pending' ? '⏳ Pending' : '❌ Rejected';

  const totalEarned = reports.filter((r) => r.status === 'verified').reduce((sum, r) => sum + r.scores, 0);

  return (
    <View style={{ gap: spacing.lg }}>
      {/* Summary */}
      <Card style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={[fonts.heading, { color: colors.gold }]}>{reports.length}</Text>
          <Text style={fonts.small}>Reports</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={[fonts.heading, { color: colors.success }]}>{reports.filter((r) => r.status === 'verified').length}</Text>
          <Text style={fonts.small}>Verified</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={[fonts.heading, { color: colors.gold }]}>{totalEarned}</Text>
          <Text style={fonts.small}>Scores earned</Text>
        </View>
      </Card>

      {reports.length === 0 ? (
        <Card style={{ alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ fontSize: 32 }}>📋</Text>
          <Text style={fonts.regular}>No reports yet</Text>
          <Text style={[fonts.small, { textAlign: 'center' }]}>
            Head to the Report tab and start earning Scores by helping your club.
          </Text>
        </Card>
      ) : (
        reports.map((r) => {
          const cat = CATEGORIES.find((c) => c.key === r.category);
          return (
            <Card key={r.id} style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text style={{ fontSize: 20 }}>{cat?.icon ?? '📝'}</Text>
                  <Text style={fonts.title}>{cat?.label ?? 'Report'}</Text>
                </View>
                <Text style={[fonts.small, { color: statusColor(r.status) }]}>{statusLabel(r.status)}</Text>
              </View>
              <Text style={fonts.regular}>{r.note}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={fonts.small}>{r.date}</Text>
                {r.scores > 0 && (
                  <Text style={{ color: colors.gold, fontWeight: '700', fontSize: 13 }}>+{r.scores} Scores</Text>
                )}
              </View>
            </Card>
          );
        })
      )}
    </View>
  );
}

// ── Leaderboard View ──
function LeaderboardView() {
  const leaders = [
    { rank: 1, name: 'Ishwar S.', reports: 42, scores: 1080, badge: '🥇' },
    { rank: 2, name: 'James P.', reports: 35, scores: 890, badge: '🥈' },
    { rank: 3, name: 'Anil K.', reports: 28, scores: 720, badge: '🥉' },
    { rank: 4, name: 'Sophie M.', reports: 22, scores: 560 },
    { rank: 5, name: 'Dave W.', reports: 19, scores: 480 },
    { rank: 6, name: 'Priya R.', reports: 15, scores: 380 },
    { rank: 7, name: 'Tom H.', reports: 12, scores: 300 },
    { rank: 8, name: 'Raj N.', reports: 9, scores: 230 },
  ];

  return (
    <View style={{ gap: spacing.lg }}>
      {/* Monthly stats */}
      <Card style={{ borderColor: 'rgba(201,168,76,0.2)', borderWidth: 1, alignItems: 'center', gap: spacing.xs }}>
        <Text style={{ fontSize: 28 }}>🏆</Text>
        <Text style={fonts.title}>November 2026</Text>
        <Text style={fonts.small}>ClubWatch Champions — top reporters earn bonus Scores at month end</Text>
      </Card>

      {/* Top 3 podium */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: spacing.sm }}>
        {[leaders[1], leaders[0], leaders[2]].map((l, i) => {
          const heights = [100, 130, 80];
          const isFirst = i === 1;
          return (
            <View key={l.rank} style={{ alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: isFirst ? 32 : 24 }}>{l.badge}</Text>
              <Text style={[fonts.small, isFirst && { color: colors.gold, fontWeight: '700' }]}>{l.name}</Text>
              <View style={[styles.podiumBar, { height: heights[i] }]}>
                <Text style={{ color: colors.gold, fontWeight: '800', fontSize: 18 }}>{l.scores}</Text>
                <Text style={[fonts.small, { fontSize: 10 }]}>{l.reports} reports</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Full leaderboard */}
      {leaders.slice(3).map((l) => (
        <Card key={l.rank} style={{ paddingVertical: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={styles.rankCircle}>
              <Text style={styles.rankText}>{l.rank}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={fonts.regular}>{l.name}</Text>
              <Text style={fonts.small}>{l.reports} reports</Text>
            </View>
            <Text style={{ color: colors.gold, fontWeight: '700' }}>{l.scores}</Text>
          </View>
        </Card>
      ))}

      {/* Reward tiers */}
      <Card style={{ gap: spacing.sm }}>
        <Text style={fonts.title}>Monthly rewards</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={fonts.regular}>🥇 1st place</Text>
          <Text style={{ color: colors.gold, fontWeight: '700' }}>+500 bonus</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={fonts.regular}>🥈 2nd place</Text>
          <Text style={{ color: colors.gold, fontWeight: '700' }}>+250 bonus</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={fonts.regular}>🥉 3rd place</Text>
          <Text style={{ color: colors.gold, fontWeight: '700' }}>+100 bonus</Text>
        </View>
      </Card>
    </View>
  );
}

// ── Main ──
export default function ClubWatchScreen() {
  const [tab, setTab] = useState('report');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={fonts.heading}>ClubWatch</Text>
          <View style={styles.liveBadge}>
            <Text style={{ fontSize: 10, color: colors.white, fontWeight: '700' }}>NEW</Text>
          </View>
        </View>
        <SubNav tabs={TABS} active={tab} onChange={setTab} />
        {tab === 'report' && <ReportView />}
        {tab === 'my_reports' && <MyReportsView />}
        {tab === 'leaderboard' && <LeaderboardView />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  content: { padding: spacing.lg, gap: spacing.lg },
  catIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.navyLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.navyBorder,
  },
  scoreBadge: {
    backgroundColor: 'rgba(201,168,76,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  scoreText: { color: colors.gold, fontWeight: '700', fontSize: 13 },
  submitBtn: {
    backgroundColor: colors.gold,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  submitText: { color: colors.navy, fontWeight: '800', fontSize: 16 },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(201,168,76,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: { color: colors.gold, fontWeight: '700', fontSize: 14 },
  liveBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  podiumBar: {
    width: 80,
    backgroundColor: colors.navyLight,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.navyBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  rankCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.navyLight,
    borderWidth: 1,
    borderColor: colors.navyBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { color: colors.textMuted, fontWeight: '700', fontSize: 14 },
});

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SubNav } from '../../components/SubNav';
import { Card } from '../../components/Card';
import { colors, fonts, radius, spacing } from '../../constants/theme';

const TABS = [
  { key: 'availability', label: 'Availability' },
  { key: 'scorecard', label: 'Live Scorecard' },
  { key: 'dressing-room', label: 'Dressing Room' },
  { key: 'highlights', label: 'Highlights' },
];

// ── Availability sub-view ──
function AvailabilityView() {
  const [available, setAvailable] = useState(false);
  const fixtures = [
    { date: 'Sat 16 Nov', vs: 'Maidenhead CC', home: true },
    { date: 'Sat 23 Nov', vs: 'Burnham CC', home: false },
    { date: 'Sat 30 Nov', vs: 'High Wycombe CC', home: true },
  ];

  return (
    <View style={{ gap: spacing.lg }}>
      <Pressable
        onPress={() => setAvailable(!available)}
        style={[styles.availBtn, available && styles.availBtnOn]}
      >
        <Ionicons name={available ? 'checkmark-circle' : 'add-circle-outline'} size={22} color={available ? colors.success : colors.textMuted} />
        <Text style={[styles.availText, available && { color: colors.success }]}>
          {available ? "You're available this week" : "I'm available"}
        </Text>
      </Pressable>

      <Text style={fonts.title}>Upcoming fixtures</Text>
      {fixtures.map((f, i) => (
        <Card key={i}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={fonts.regular}>{f.vs}</Text>
              <Text style={fonts.small}>{f.date} · {f.home ? 'Home' : 'Away'}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: f.home ? 'rgba(52,211,153,0.15)' : 'rgba(96,165,250,0.15)' }]}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: f.home ? colors.success : '#60A5FA' }}>
                {f.home ? 'HOME' : 'AWAY'}
              </Text>
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

// ── Live Scorecard sub-view ──
function ScorecardView() {
  const battingData = [
    { name: 'R. Sharma', runs: 58, balls: 72, sr: '80.5', status: 'In' },
    { name: 'A. Patel', runs: 31, balls: 44, sr: '70.4', status: 'In' },
    { name: 'K. Menon', runs: 22, balls: 18, sr: '122.2', status: 'c Wilson b Taylor' },
    { name: 'Ishwar Suresh', runs: 14, balls: 21, sr: '66.6', status: 'b Carter' },
  ];

  return (
    <View style={{ gap: spacing.lg }}>
      <Card style={{ borderColor: 'rgba(52,211,153,0.3)', borderWidth: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={fonts.title}>Slough CC</Text>
            <Text style={[fonts.big, { fontSize: 36 }]}>163/3</Text>
            <Text style={fonts.small}>32.4 overs</Text>
          </View>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={{ color: colors.success, fontSize: 12, fontWeight: '700' }}>LIVE</Text>
          </View>
        </View>
      </Card>

      <Text style={fonts.title}>Batting</Text>
      {battingData.map((b, i) => (
        <Card key={i} style={{ paddingVertical: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={[fonts.regular, b.name === 'Ishwar Suresh' && { color: colors.gold }]}>{b.name}</Text>
              <Text style={fonts.small}>{b.status}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[fonts.title, { fontSize: 20 }]}>{b.runs}</Text>
              <Text style={fonts.small}>{b.balls} balls · SR {b.sr}</Text>
            </View>
          </View>
        </Card>
      ))}

      <Card>
        <Text style={fonts.title}>vs Maidenhead CC</Text>
        <Text style={[fonts.small, { marginTop: 4 }]}>Berkshire League · 10 Nov 2026</Text>
        <Text style={[fonts.small, { marginTop: 8 }]}>Maidenhead won the toss and elected to field</Text>
      </Card>
    </View>
  );
}

// ── Dressing Room sub-view ──
function DressingRoomView() {
  const messages = [
    { from: 'Captain', text: 'Great effort lads, keep rotating strike 💪', time: '14:22' },
    { from: 'Coach', text: 'Next batsman — watch for the yorker, he bowls it 4th-5th over', time: '14:18' },
    { from: 'Ishwar', text: 'Drinks break at 35 overs?', time: '14:10' },
  ];

  return (
    <View style={{ gap: spacing.md }}>
      <Card style={{ borderColor: 'rgba(201,168,76,0.2)', borderWidth: 1 }}>
        <Text style={fonts.small}>🏟️ Team chat for match day. Messages visible only to your squad.</Text>
      </Card>
      {messages.map((m, i) => (
        <Card key={i}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={[fonts.regular, { fontWeight: '700' }]}>{m.from}</Text>
            <Text style={fonts.small}>{m.time}</Text>
          </View>
          <Text style={fonts.regular}>{m.text}</Text>
        </Card>
      ))}
    </View>
  );
}

// ── Highlights sub-view ──
function HighlightsView() {
  const clips = [
    { title: 'Sharma cover drive — 4 runs', over: '28.3', type: 'Batting' },
    { title: 'Menon reverse sweep six', over: '22.1', type: 'Batting' },
    { title: 'Ishwar caught at slip', over: '19.4', type: 'Wicket' },
    { title: 'Patel edges through slips — lucky!', over: '31.2', type: 'Batting' },
  ];

  return (
    <View style={{ gap: spacing.md }}>
      <Card style={{ borderColor: 'rgba(201,168,76,0.2)', borderWidth: 1 }}>
        <Text style={fonts.small}>📹 AI-generated highlights from today's match. Full video available after stumps.</Text>
      </Card>
      {clips.map((c, i) => (
        <Card key={i}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={fonts.regular}>{c.title}</Text>
              <Text style={fonts.small}>Over {c.over}</Text>
            </View>
            <View style={[styles.badge, {
              backgroundColor: c.type === 'Wicket' ? 'rgba(248,113,113,0.15)' : 'rgba(201,168,76,0.15)',
            }]}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: c.type === 'Wicket' ? colors.danger : colors.gold }}>
                {c.type}
              </Text>
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

// ── Main screen ──
export default function MatchScreen() {
  const [tab, setTab] = useState('availability');
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={fonts.heading}>Match Day</Text>
          <Pressable onPress={() => router.push('/profile')}>
            <Ionicons name="person-circle-outline" size={28} color={colors.textMuted} />
          </Pressable>
        </View>
        <SubNav tabs={TABS} active={tab} onChange={setTab} />

        {tab === 'availability' && <AvailabilityView />}
        {tab === 'scorecard' && <ScorecardView />}
        {tab === 'dressing-room' && <DressingRoomView />}
        {tab === 'highlights' && <HighlightsView />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  content: { padding: spacing.lg, gap: spacing.lg },
  availBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.navyBorder, backgroundColor: colors.navyLight,
  },
  availBtnOn: { borderColor: 'rgba(52,211,153,0.4)', backgroundColor: 'rgba(52,211,153,0.08)' },
  availText: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: 'rgba(52,211,153,0.12)' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
});

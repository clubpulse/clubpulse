import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SubNav } from '../../components/SubNav';
import { Card } from '../../components/Card';
import { useAuth } from '../../hooks/useAuth';
import { colors, fonts, radius, spacing } from '../../constants/theme';

const TABS = [
  { key: 'members', label: 'Members' },
  { key: 'insights', label: 'AI Insights' },
  { key: 'controls', label: 'Controls' },
  { key: 'revenue', label: 'Revenue' },
];

// ── Members ──
function MembersView() {
  const members = [
    { name: 'Ishwar Suresh', role: 'club_admin', joined: 'Mar 2024', status: 'Active' },
    { name: 'R. Sharma', role: 'player', joined: 'Apr 2024', status: 'Active' },
    { name: 'K. Menon', role: 'player', joined: 'Apr 2024', status: 'Active' },
    { name: 'A. Patel', role: 'player', joined: 'May 2024', status: 'Active' },
    { name: 'D. Wilson', role: 'player', joined: 'Jun 2024', status: 'Active' },
    { name: 'M. Hassan', role: 'player', joined: 'Jul 2024', status: 'Inactive' },
  ];

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Text style={fonts.small}>TOTAL</Text>
          <Text style={[fonts.big, { fontSize: 28 }]}>{members.length}</Text>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Text style={fonts.small}>ACTIVE</Text>
          <Text style={[fonts.big, { fontSize: 28, color: colors.success }]}>{members.filter(m => m.status === 'Active').length}</Text>
        </Card>
      </View>
      {members.map((m, i) => (
        <Card key={i} style={{ paddingVertical: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={fonts.regular}>{m.name}</Text>
              <Text style={fonts.small}>{m.joined}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <View style={[styles.badge, {
                backgroundColor: m.role === 'club_admin' ? 'rgba(201,168,76,0.15)' : 'rgba(96,165,250,0.15)',
              }]}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: m.role === 'club_admin' ? colors.gold : '#60A5FA' }}>
                  {m.role === 'club_admin' ? 'Admin' : 'Player'}
                </Text>
              </View>
              <View style={[styles.badge, {
                backgroundColor: m.status === 'Active' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
              }]}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: m.status === 'Active' ? colors.success : colors.danger }}>
                  {m.status}
                </Text>
              </View>
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

// ── AI Insights ──
function InsightsView() {
  return (
    <View style={{ gap: spacing.lg }}>
      <Card style={{ borderColor: 'rgba(201,168,76,0.3)', borderWidth: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
          <Text style={{ fontSize: 24 }}>🤖</Text>
          <Text style={fonts.title}>Club Health Report</Text>
        </View>
        <Text style={fonts.regular}>
          Member engagement is up 12% this month. 78% of members earned Scores last week, above the 65% target.
          Bar revenue via Scores increased 23% week-on-week. Recommend running a raffle to boost engagement further.
        </Text>
      </Card>

      <Card>
        <Text style={fonts.title}>Retention risk</Text>
        <Text style={[fonts.small, { marginTop: 4 }]}>2 members haven't logged in for 3+ weeks:</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          {['M. Hassan', 'T. Carter'].map((name, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[fonts.regular, { color: colors.danger }]}>{name}</Text>
              <Pressable style={[styles.badge, { backgroundColor: 'rgba(96,165,250,0.15)' }]}>
                <Text style={{ fontSize: 11, color: '#60A5FA', fontWeight: '600' }}>Send nudge</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={fonts.title}>Top earners this week</Text>
        <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
          {[
            { name: 'R. Sharma', scores: 450 },
            { name: 'K. Menon', scores: 380 },
            { name: 'A. Patel', scores: 210 },
          ].map((p, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
              <Text style={fonts.regular}>{p.name}</Text>
              <Text style={{ color: colors.gold, fontWeight: '700' }}>+{p.scores}</Text>
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}

// ── Controls ──
function ControlsView() {
  const rules = [
    { name: 'Daily check-in', value: 5, enabled: true },
    { name: 'Weekly challenge', value: 10, enabled: true },
    { name: 'All weekly done bonus', value: 25, enabled: true },
    { name: '50 runs bonus', value: 75, enabled: true },
    { name: 'Century bonus', value: 200, enabled: true },
    { name: '3-wicket haul', value: 50, enabled: true },
    { name: '5-wicket haul', value: 150, enabled: false },
  ];

  return (
    <View style={{ gap: spacing.lg }}>
      <Card style={{ borderColor: 'rgba(201,168,76,0.2)', borderWidth: 1 }}>
        <Text style={fonts.small}>Scores rules — set how many Scores your members earn for each activity. Changes take effect immediately.</Text>
      </Card>

      {rules.map((r, i) => (
        <Card key={i} style={[{ paddingVertical: spacing.sm }, !r.enabled && { opacity: 0.5 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={fonts.regular}>{r.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={{ color: colors.gold, fontWeight: '700' }}>+{r.value}</Text>
              <View style={[styles.toggleTrack, r.enabled && styles.toggleOn]}>
                <View style={[styles.toggleThumb, r.enabled && styles.toggleThumbOn]} />
              </View>
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

// ── Revenue ──
function RevenueView() {
  return (
    <View style={{ gap: spacing.lg }}>
      <Card style={{ borderColor: 'rgba(201,168,76,0.3)', borderWidth: 1 }}>
        <Text style={[fonts.small, { color: colors.gold }]}>💷 Cash is B2B only — ClubPulse settles to your club bank weekly via Wise/Tremendous</Text>
      </Card>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Text style={fonts.small}>CLUB OWED</Text>
          <Text style={[fonts.big, { fontSize: 24, color: colors.success }]}>£142.50</Text>
          <Text style={fonts.small}>This week</Text>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Text style={fonts.small}>PLATFORM</Text>
          <Text style={[fonts.big, { fontSize: 24, color: colors.gold }]}>£7.50</Text>
          <Text style={fonts.small}>5% fee</Text>
        </Card>
      </View>

      <Card>
        <Text style={fonts.title}>Payments processed</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          {[
            { desc: 'Match fees (15 × £10)', club: '£142.50', fee: '£7.50' },
            { desc: 'Bar tabs (8 × avg £5)', club: '£38.00', fee: '£2.00' },
            { desc: 'Coaching (2 × £20)', club: '£38.00', fee: '£2.00' },
          ].map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
              <Text style={[fonts.small, { flex: 1 }]}>{r.desc}</Text>
              <Text style={[fonts.small, { color: colors.success, width: 60, textAlign: 'right' }]}>{r.club}</Text>
              <Text style={[fonts.small, { color: colors.gold, width: 50, textAlign: 'right' }]}>{r.fee}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={fonts.title}>Subscription revenue</Text>
        <Text style={[fonts.small, { marginTop: 4 }]}>100% to ClubPulse</Text>
        <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
          {[
            { tier: 'Pro (£9.99/mo)', count: 8 },
            { tier: 'Elite (£22.99/mo)', count: 3 },
            { tier: 'Legend (£34.99/mo)', count: 1 },
          ].map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
              <Text style={fonts.small}>{s.tier}</Text>
              <Text style={fonts.small}>{s.count} members</Text>
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}

// ── Main ──
export default function AdminScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('members');

  // Role gate: check user metadata for admin role
  // In production this would come from the database
  const roles: string[] = (user?.user_metadata?.roles as string[]) ?? ['player'];
  const isAdmin = roles.includes('club_admin');

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
          <Text style={{ fontSize: 48, marginBottom: spacing.md }}>🔒</Text>
          <Text style={[fonts.title, { textAlign: 'center' }]}>Admin access only</Text>
          <Text style={[fonts.small, { textAlign: 'center', marginTop: spacing.sm }]}>
            This section is visible only to club administrators.
          </Text>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { marginTop: spacing.xl }]}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={fonts.heading}>Club Admin</Text>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </Pressable>
        </View>
        <SubNav tabs={TABS} active={tab} onChange={setTab} />
        {tab === 'members' && <MembersView />}
        {tab === 'insights' && <InsightsView />}
        {tab === 'controls' && <ControlsView />}
        {tab === 'revenue' && <RevenueView />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  content: { padding: spacing.lg, gap: spacing.lg },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  backBtn: { borderWidth: 1, borderColor: colors.navyBorder, paddingVertical: 12, paddingHorizontal: 24, borderRadius: radius.md },
  toggleTrack: { width: 40, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', paddingHorizontal: 2 },
  toggleOn: { backgroundColor: 'rgba(52,211,153,0.3)' },
  toggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.textMuted },
  toggleThumbOn: { backgroundColor: colors.success, alignSelf: 'flex-end' },
});

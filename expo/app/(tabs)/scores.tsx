import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SubNav } from '../../components/SubNav';
import { Card } from '../../components/Card';
import { colors, fonts, radius, spacing } from '../../constants/theme';

const TABS = [
  { key: 'earn', label: 'Earn' },
  { key: 'spend', label: 'Spend' },
  { key: 'marketplace', label: 'Marketplace' },
  { key: 'raffle', label: 'Raffle' },
];

// ── Earn ──
function EarnView() {
  const categories = [
    {
      title: '🏏 Match performance',
      items: [
        { name: 'Score 25+ runs', scores: 25 },
        { name: 'Score a fifty', scores: 75 },
        { name: 'Score a century', scores: 200 },
        { name: 'Take 3+ wickets', scores: 50 },
        { name: 'Take a 5-wicket haul', scores: 150 },
        { name: 'Run out / stumping', scores: 15 },
        { name: 'Catch', scores: 10 },
      ],
    },
    {
      title: '🎯 Daily challenges',
      items: [
        { name: 'Daily check-in', scores: 5 },
        { name: 'Weekly challenge', scores: 10 },
        { name: 'All weekly challenges done', scores: 25 },
        { name: '7-day streak', scores: 50 },
      ],
    },
    {
      title: '🚶 Activity',
      items: [
        { name: '5,000 steps', scores: 5 },
        { name: '10,000 steps', scores: 15 },
        { name: '15,000 steps', scores: 25 },
      ],
    },
    {
      title: '📸 ClubWatch',
      items: [
        { name: 'Report a safety hazard', scores: 40 },
        { name: 'Report vandalism', scores: 50 },
        { name: 'Report pitch issue', scores: 25 },
        { name: 'Report equipment issue', scores: 20 },
        { name: 'Report cleanliness issue', scores: 15 },
        { name: 'Monthly top reporter bonus', scores: 500 },
      ],
    },
    {
      title: '🤝 Social',
      items: [
        { name: 'Refer a friend', scores: 100 },
        { name: 'Share a highlight', scores: 10 },
        { name: 'Rate a match', scores: 5 },
      ],
    },
  ];

  return (
    <View style={{ gap: spacing.lg }}>
      <Card style={{ borderColor: 'rgba(201,168,76,0.2)', borderWidth: 1, alignItems: 'center' }}>
        <Text style={fonts.small}>YOUR SCORES</Text>
        <Text style={[fonts.big, { color: colors.gold }]}>4,850</Text>
        <Text style={fonts.small}>500 Scores = £1</Text>
      </Card>

      {categories.map((cat, ci) => (
        <View key={ci} style={{ gap: spacing.sm }}>
          <Text style={fonts.title}>{cat.title}</Text>
          {cat.items.map((item, ii) => (
            <Card key={ii} style={{ paddingVertical: spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={fonts.regular}>{item.name}</Text>
                <Text style={{ color: colors.gold, fontWeight: '700' }}>+{item.scores}</Text>
              </View>
            </Card>
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Spend ──
function SpendView() {
  const spendOptions = [
    { name: 'Clubhouse bar tab', desc: 'Spend Scores at the bar', icon: '🍺', cost: '500 Scores = £1' },
    { name: 'Coaching session', desc: 'Book 1-on-1 with the pro', icon: '🏋️', cost: '750 Scores' },
    { name: 'Gift cards', desc: 'Amazon, JD Sports, Costa & more', icon: '🎁', cost: 'From 300' },
    { name: 'Net hire', desc: 'Book practice nets at the ground', icon: '🏟️', cost: '400 Scores' },
    { name: 'Brand offers', desc: 'Nike, Nando\'s, ASOS discounts', icon: '🏷️', cost: 'Various' },
  ];

  return (
    <View style={{ gap: spacing.lg }}>
      <Card style={{ borderColor: 'rgba(52,211,153,0.2)', borderWidth: 1 }}>
        <Text style={[fonts.small, { color: colors.success }]}>✓ Cash only flows B2B — ClubPulse → Club</Text>
        <Text style={[fonts.small, { marginTop: 4 }]}>
          Members spend Scores on rewards, gift cards, and club services. No cash payouts to members.
        </Text>
      </Card>

      {spendOptions.map((opt, i) => (
        <Card key={i}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={styles.spendIcon}>
              <Text style={{ fontSize: 28 }}>{opt.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={fonts.regular}>{opt.name}</Text>
              <Text style={fonts.small}>{opt.desc}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: 'rgba(201,168,76,0.15)' }]}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.gold }}>{opt.cost}</Text>
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

// ── Marketplace ──
function MarketplaceView() {
  const offers = [
    { brand: 'Nike', discount: '15% off', cost: 1500, category: 'Sportswear' },
    { brand: 'JD Sports', discount: '10% off', cost: 1000, category: 'Sportswear' },
    { brand: 'Nando\'s', discount: '£5 off', cost: 1000, category: 'Food' },
    { brand: 'Costa', discount: 'Free coffee', cost: 600, category: 'Food' },
    { brand: 'ASOS', discount: '20% off', cost: 1200, category: 'Fashion' },
    { brand: 'Uber Eats', discount: '£3 off', cost: 500, category: 'Food' },
    { brand: 'Amazon', discount: '£5 gift card', cost: 2500, category: 'Gift Card' },
    { brand: 'Greggs', discount: 'Free sausage roll', cost: 500, category: 'Food' },
  ];

  return (
    <View style={{ gap: spacing.md }}>
      {offers.map((o, i) => (
        <Card key={i}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={fonts.regular}>{o.brand}</Text>
              <Text style={[fonts.title, { color: colors.gold, fontSize: 15 }]}>{o.discount}</Text>
              <Text style={fonts.small}>{o.category}</Text>
            </View>
            <Pressable style={styles.redeemBtn}>
              <Text style={styles.redeemText}>{o.cost.toLocaleString()} ⭐</Text>
            </Pressable>
          </View>
        </Card>
      ))}
    </View>
  );
}

// ── Raffle ──
function RaffleView() {
  const [tickets, setTickets] = useState(0);
  const raffles = [
    { prize: 'England Test Match Tickets (2x)', ticketCost: 100, entries: 342, endsIn: '3 days' },
    { prize: '£50 Amazon Gift Card', ticketCost: 50, entries: 187, endsIn: '5 days' },
    { prize: 'Gray-Nicolls bat signed by Root', ticketCost: 200, entries: 89, endsIn: '1 week' },
  ];

  return (
    <View style={{ gap: spacing.lg }}>
      <Card style={{ borderColor: 'rgba(201,168,76,0.3)', borderWidth: 1, alignItems: 'center', gap: spacing.sm }}>
        <Text style={{ fontSize: 32 }}>🎟️</Text>
        <Text style={fonts.title}>Raffle draws</Text>
        <Text style={[fonts.small, { textAlign: 'center' }]}>
          Buy raffle tickets with Scores. Prizes are gift cards, experiences, and gear — never cash.
        </Text>
        <Text style={fonts.small}>5% platform fee on every ticket before the 60/40 prize/club split</Text>
      </Card>

      {raffles.map((r, i) => (
        <Card key={i}>
          <Text style={fonts.title}>{r.prize}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }}>
            <Text style={fonts.small}>{r.entries} entries</Text>
            <Text style={fonts.small}>Ends in {r.endsIn}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md }}>
            <Text style={{ color: colors.gold, fontWeight: '700' }}>{r.ticketCost} Scores/ticket</Text>
            <Pressable
              onPress={() => setTickets(tickets + 1)}
              style={styles.redeemBtn}
            >
              <Text style={styles.redeemText}>Buy ticket</Text>
            </Pressable>
          </View>
        </Card>
      ))}

      {tickets > 0 && (
        <Card style={{ alignItems: 'center', backgroundColor: 'rgba(52,211,153,0.08)' }}>
          <Text style={[fonts.regular, { color: colors.success }]}>You've bought {tickets} ticket{tickets !== 1 ? 's' : ''} this session</Text>
        </Card>
      )}
    </View>
  );
}

// ── Main ──
export default function ScoresScreen() {
  const [tab, setTab] = useState('earn');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={fonts.heading}>Scores</Text>
        <SubNav tabs={TABS} active={tab} onChange={setTab} />
        {tab === 'earn' && <EarnView />}
        {tab === 'spend' && <SpendView />}
        {tab === 'marketplace' && <MarketplaceView />}
        {tab === 'raffle' && <RaffleView />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  content: { padding: spacing.lg, gap: spacing.lg },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm },
  spendIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.navyLight, alignItems: 'center', justifyContent: 'center' },
  redeemBtn: { backgroundColor: 'rgba(201,168,76,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.sm },
  redeemText: { color: colors.gold, fontWeight: '700', fontSize: 13 },
});

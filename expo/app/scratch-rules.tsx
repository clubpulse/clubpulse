// The official rules for scratch cards. Apple requires a free prize draw to show its rules inside
// the app and to say that Apple is not a sponsor. Keep in step with the website's copy at
// src/app/scratch-card-rules/page.tsx.

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, spacing } from '../constants/theme';

const RULES: { heading: string; lines: string[] }[] = [
  {
    heading: 'Who runs it',
    lines: [
      'SHIFTUP scratch cards are a free prize draw run by SHIFTUP. You can reach us at hello@shiftup.club.',
      'Apple is not a sponsor of this prize draw and is not involved in it in any way. No prize is an Apple product.',
    ],
  },
  {
    heading: 'Who can take part',
    lines: [
      'You must be aged 18 or over and live in the United Kingdom.',
      'You need a ShiftUp account that belongs to a club which has scratch cards switched on.',
      'Junior accounts cannot receive or open scratch cards.',
      'One account per person.',
    ],
  },
  {
    heading: 'It is free',
    lines: ['Scratch cards cannot be bought. A card costs no money and no Scores, and nothing you buy improves your chance of a prize.'],
  },
  {
    heading: 'How you get a card',
    lines: [
      'Check in on seven days in a row: the seventh day gives you a card.',
      'Complete tasks your club has chosen to reward, such as volunteer shifts, Academy lessons or video analysis. Your club sets how many it takes, and there is a weekly limit.',
      'Take part in a game that awards a card, where one is running.',
      'Reach a Scores milestone, where your club has set one.',
      'Your club awards you a card.',
    ],
  },
  {
    heading: 'How prizes are decided',
    lines: [
      'When you open a card, our server picks its result at random. Each possible result, and its chance, is shown on the Scratch cards screen before you open a card. The chances are set by your club and are the same for every member of that club.',
      'The result is not affected by skill, by how or when you scratch, or by cards you opened before.',
    ],
  },
  {
    heading: 'The prizes',
    lines: [
      'Scores are added to your balance straight away.',
      'Gift cards are sent to the email address on your account, normally within 14 days.',
      'Club rewards are provided by your club and are claimed at the club.',
      'Some cards hold no prize.',
    ],
  },
  {
    heading: 'Limits',
    lines: [
      'Prizes cannot be swapped for cash and cannot be passed to someone else.',
      'If a prize becomes unavailable we will replace it with one of equal or greater value.',
      'We may cancel cards and prizes obtained by cheating, by using more than one account, or by breaking our terms.',
    ],
  },
  {
    heading: 'Your information',
    lines: ['We use your account details to record the cards you earn and to send your prize. See the privacy policy at shiftup.club/privacy.'],
  },
  {
    heading: 'Changes and questions',
    lines: [
      'We may change these rules or end scratch cards. If we do, a card you have already earned can still be opened under the rules that applied when you earned it.',
      'These rules are governed by the law of England and Wales. Questions and complaints: hello@shiftup.club.',
    ],
  },
];

export default function ScratchRulesScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={fonts.small}>Last updated 18 November 2026</Text>
        {RULES.map((section, i) => (
          <View key={section.heading} style={styles.card}>
            <Text style={styles.heading}>{i + 1}. {section.heading}</Text>
            {section.lines.map((line) => (
              <Text key={line} style={[fonts.regular, styles.line]} selectable>{line}</Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.navyBorder, padding: spacing.lg },
  heading: { color: colors.white, fontSize: 16, fontWeight: '800', marginBottom: spacing.xs },
  line: { marginTop: spacing.sm, lineHeight: 21 },
});

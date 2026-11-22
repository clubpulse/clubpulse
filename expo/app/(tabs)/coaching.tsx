// Coaching and video: the way in to video analysis, highlights, progress tracking and coaching.
// These features run on the SHIFTUP website, so each row opens that page inside the app
// (see web.tsx), already signed in.

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '../../constants/theme';
import { BackBar } from '../../components/BackBar';

type Row = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
  /** A page on the website, or a screen in the app */
  path?: string;
  screen?: '/(tabs)/coaches' | '/academy';
  camera?: boolean;
};

const SECTIONS: { heading: string; rows: Row[] }[] = [
  {
    heading: 'VIDEO ANALYSIS',
    rows: [
      {
        icon: 'videocam',
        title: 'Analyse my technique',
        detail: 'Film your batting or bowling live, or upload a clip. Get a score out of 100 with tips for each part of your action.',
        path: '/analyse',
        camera: true,
      },
      {
        icon: 'film',
        title: 'My highlights',
        detail: 'The best three clips from your latest session.',
        path: '/highlights',
      },
      {
        icon: 'albums',
        title: 'All sessions',
        detail: 'Every session you have filmed, newest first.',
        path: '/highlights/sessions',
      },
    ],
  },
  {
    heading: 'MY DEVELOPMENT',
    rows: [
      {
        icon: 'trending-up',
        title: 'Development tracking',
        detail: 'Where each skill is heading, based on your analysis sessions.',
        path: '/development',
      },
      {
        icon: 'time',
        title: 'Coaching history',
        detail: 'Past scores, speed trends and the feedback you were given.',
        path: '/coaching-history',
      },
      {
        icon: 'document-text',
        title: 'Player report',
        detail: 'A written report on your recent matches: strengths, focus areas and a target for next time.',
        path: '/player-report',
      },
      {
        icon: 'school',
        title: 'Academy lessons',
        detail: 'Short lessons and a weekly practice plan.',
        screen: '/academy',
      },
    ],
  },
  {
    heading: 'COACHING',
    rows: [
      {
        icon: 'calendar',
        title: 'Book coaching',
        detail: 'One-to-one and group sessions at your club. Coaches manage their sessions here too.',
        path: '/coaching',
      },
      {
        icon: 'people',
        title: 'Find a coach',
        detail: 'Browse coaches, levels and rates.',
        screen: '/(tabs)/coaches',
      },
      {
        icon: 'ribbon',
        title: 'Courses and qualifications',
        detail: 'ECB courses and the qualifications you hold.',
        path: '/qualifications',
      },
    ],
  },
];

export default function CoachingScreen() {
  const router = useRouter();

  const open = (row: Row) => {
    if (row.screen) router.push(row.screen);
    else if (row.path) router.push({ pathname: '/web', params: { path: row.path, title: row.title, camera: row.camera ? '1' : '0' } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BackBar />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ marginBottom: spacing.md }}>
          <Text style={fonts.heading}>Coaching</Text>
          <Text style={[fonts.small, { marginTop: 2 }]}>Film your technique, follow your progress and find a coach.</Text>
        </View>
        {SECTIONS.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>
            {section.rows.map((row) => (
              <Pressable
                key={row.title}
                onPress={() => open(row)}
                accessibilityRole="button"
                accessibilityLabel={`${row.title}. ${row.detail}`}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
              >
                <View style={styles.icon}>
                  <Ionicons name={row.icon} size={22} color={colors.gold} />
                </View>
                <View style={styles.text}>
                  <Text style={styles.title}>{row.title}</Text>
                  <Text style={fonts.small}>{row.detail}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        ))}
        <Text style={[fonts.small, styles.note]}>
          Video analysis reads your video on this phone. Only your scores and your highlight clips are saved.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  section: { marginBottom: spacing.xl },
  heading: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface1,
    borderColor: colors.navyBorder,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.goldDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  title: { color: colors.white, fontSize: 16, fontWeight: '700' },
  note: { textAlign: 'center' },
});

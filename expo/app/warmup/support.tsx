// "Talk to someone": where to turn when things are hard. Warm-Up is preparation for sport; it is
// not a substitute for a person. The services and numbers here were checked against each
// service's own website in November 2026 and should be checked again before each release.

import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, display, fonts, radius, spacing } from '../../constants/theme';

const PINK = '#F472B6';

type Service = { name: string; who: string; how: string; action: string; url: string; icon: 'call' | 'chatbubble' };
const SERVICES: Service[] = [
  { name: 'Childline', who: 'For anyone under 19', how: 'Free to call, any time, day or night.', action: 'Call 0800 1111', url: 'tel:08001111', icon: 'call' },
  { name: 'Samaritans', who: 'For anyone, any age', how: 'Free to call from any phone, any time, day or night.', action: 'Call 116 123', url: 'tel:116123', icon: 'call' },
  { name: 'Shout', who: 'For anyone who would rather text', how: 'Text the word SHOUT. Free from the main UK mobile networks, any time.', action: 'Text SHOUT to 85258', url: 'sms:85258', icon: 'chatbubble' },
];

export default function SupportScreen() {
  const open = (url: string) => Linking.openURL(url).catch(() => {});
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">Talk to someone</Text>
        <Text style={styles.para}>
          Everyone has hard days, in cricket and out of it. If something is weighing on you, talking to a person helps more than any exercise in an app.
        </Text>

        <View style={styles.urgent} accessibilityRole="alert">
          <Text style={styles.urgentTitle}>If you or someone else is in danger right now</Text>
          <Text style={styles.para}>Call 999, or go to A&E.</Text>
          <Pressable onPress={() => open('tel:999')} accessibilityRole="button" style={styles.urgentBtn}><Ionicons name="call" size={18} color={colors.white} /><Text style={styles.urgentBtnText}>Call 999</Text></Pressable>
        </View>

        <Text style={styles.section} accessibilityRole="header">People who will listen</Text>
        {SERVICES.map((s) => (
          <View key={s.name} style={styles.card}>
            <Text style={styles.name}>{s.name}</Text>
            <Text style={styles.who}>{s.who}</Text>
            <Text style={styles.para}>{s.how}</Text>
            <Pressable onPress={() => open(s.url)} accessibilityRole="button" style={styles.btn}><Ionicons name={s.icon} size={18} color="#04091A" /><Text style={styles.btnText}>{s.action}</Text></Pressable>
          </View>
        ))}

        <Text style={styles.section} accessibilityRole="header">People you know</Text>
        <View style={styles.card}>
          <Text style={styles.para}>A parent or carer, a friend, a teacher, your GP, or someone at your club. Most cricket clubs have a Safeguarding Officer whose job is to listen and help; ask a committee member who yours is.</Text>
        </View>

        <Text style={fonts.small}>SHIFTUP does not see who opens this page or who you contact.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { fontFamily: display.heavy, fontSize: 26, color: colors.white },
  para: { fontSize: 15, lineHeight: 23, color: colors.text },
  section: { fontFamily: display.bold, fontSize: 17, color: colors.white, marginTop: spacing.sm },
  urgent: { borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(248,113,113,0.5)', backgroundColor: 'rgba(248,113,113,0.10)', padding: spacing.lg, gap: spacing.sm },
  urgentTitle: { fontSize: 16, fontWeight: '700', color: colors.white },
  urgentBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#DC2626', borderRadius: radius.pill, minHeight: 48 },
  urgentBtnText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  card: { backgroundColor: colors.navyLight, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: 6 },
  name: { fontFamily: display.bold, fontSize: 18, color: colors.white },
  who: { fontSize: 13, fontWeight: '700', color: PINK },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: PINK, borderRadius: radius.pill, minHeight: 48, marginTop: spacing.sm },
  btnText: { color: '#04091A', fontWeight: '800', fontSize: 15 },
});

// One role's dashboard: Player, Coach, Parent or Admin. An animated header in the role's colours,
// four figures, what is next, a short list and that role's tools. It is the top of Home, and also
// the screen at /role/<role>. Mirrors the website's role pages.

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../lib/api';
import { ROLE_PAGES, type PageRole, type Target } from '../lib/rolePages';
import { CountUp, GlowCard, Hero } from './Magic';
import { colors, display, fonts, radius, spacing } from '../constants/theme';

type Stat = { label: string; hint: string; value?: number; text?: string; suffix?: string };
export type RolePageData = {
  role: PageRole;
  held: boolean;
  pages: PageRole[];
  stats: Stat[];
  next: { eyebrow: string; title: string; detail: string } | null;
  listTitle: string;
  rows: Array<{ title: string; detail: string; badge?: string }>;
  empty: string;
};

/** Loads one role's figures. `load` can be called again to refresh. */
export function useRolePage(role: PageRole | null) {
  const [data, setData] = useState<RolePageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!role) return;
    try {
      setData(await api<RolePageData>(`/api/role-page?role=${role}`));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this page.');
    }
  }, [role]);

  useEffect(() => { setData(null); load(); }, [load]);

  // Figures for another role are never shown under this role's header
  return { data: data && data.role === role ? data : null, error, load };
}

type Props = {
  role: PageRole;
  firstName: string;
  data: RolePageData | null;
  error: string | null;
  onRetry: () => void;
  onSwitch: (role: PageRole) => void;
  /** Shown in place of the "next" card. Home puts the next match here, with its availability buttons. */
  nextSlot?: ReactNode;
};

export function RoleDashboard({ role, firstName, data, error, onRetry, onSwitch, nextSlot }: Props) {
  const page = ROLE_PAGES[role];
  const router = useRouter();

  const go = (to: Target) => {
    if ('screen' in to) router.push(to.screen as never);
    else router.push({ pathname: '/web', params: { path: to.web, title: to.title, camera: to.camera ? '1' : '0' } });
  };

  return (
    <View style={styles.wrap}>
        <Hero from={page.from} to={page.to}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}><Text style={{ color: page.from }}>●</Text>  {firstName.toUpperCase()}, {page.lead.toUpperCase()}</Text>
              <Text style={styles.title} accessibilityRole="header">{page.title}</Text>
            </View>
            <Text style={styles.heroIcon} accessibilityElementsHidden importantForAccessibility="no">{page.icon}</Text>
          </View>
          <Text style={styles.tagline}>{page.tagline}</Text>

          <Pressable onPress={() => go(page.action.to)} accessibilityRole="button" style={({ pressed }) => [styles.action, { backgroundColor: page.from }, pressed && { opacity: 0.85 }]}>
            <Text style={styles.actionText}>{page.action.label}  →</Text>
          </Pressable>

          {/* Moving between the roles this person holds */}
          {data && data.pages.length > 1 && (
            <View style={styles.switcher} accessibilityRole="tablist">
              {data.pages.map((r) => {
                const on = r === role;
                return (
                  <Pressable key={r} onPress={() => { if (!on) onSwitch(r); }} accessibilityRole="tab" accessibilityState={{ selected: on }}
                    style={[styles.pill, on && styles.pillOn]}>
                    <Text style={[styles.pillText, on && { color: colors.white }]}>{ROLE_PAGES[r].icon}  {ROLE_PAGES[r].title}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Hero>

        {!data && !error && <ActivityIndicator color={page.from} style={{ marginTop: spacing.xl }} />}
        {error && !data && (
          <GlowCard>
            <Text style={fonts.regular}>{error}</Text>
            <Pressable onPress={onRetry} accessibilityRole="button"><Text style={[styles.link, { color: page.from }]}>Try again</Text></Pressable>
          </GlowCard>
        )}

        {data && !data.held && (
          <GlowCard tint={page.from}>
            <Text style={fonts.title}>This page is not open to you yet</Text>
            <Text style={[fonts.small, { marginTop: 6, lineHeight: 19 }]}>
              {role === 'admin'
                ? 'It is for the people who run a club on ClubPulse. If that should be you, ask your club to make you an admin.'
                : `It is for members with the ${page.title.toLowerCase()} role. You can ask to add it from your profile, and your club will confirm it.`}
            </Text>
            <Pressable onPress={() => router.push('/(tabs)/profile')} accessibilityRole="button"><Text style={[styles.link, { color: page.from }]}>Go to my profile</Text></Pressable>
          </GlowCard>
        )}

        {data?.held && (
          <>
            <View style={styles.grid}>
              {data.stats.map((stat, i) => (
                <GlowCard key={stat.label} index={i + 1} tint={i % 2 === 0 ? page.from : page.to} slot={styles.stat}>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  <View style={styles.statRow}>
                    {stat.value !== undefined ? <CountUp value={stat.value} style={styles.statValue} /> : <Text style={styles.statValue}>{stat.text}</Text>}
                    {stat.suffix && <Text style={styles.statSuffix}>{stat.suffix}</Text>}
                  </View>
                  <Text style={styles.statHint}>{stat.hint}</Text>
                </GlowCard>
              ))}
            </View>

            {nextSlot ?? <GlowCard index={5} tint={page.from}>
              <Text style={[styles.cardEyebrow, { color: page.from }]}>{data.next ? data.next.eyebrow.toUpperCase() : 'COMING UP'}</Text>
              <Text style={styles.nextTitle}>{data.next ? data.next.title : 'Nothing in the diary'}</Text>
              <Text style={[fonts.small, { marginTop: 4 }]}>{data.next ? data.next.detail : 'What is next for you appears here.'}</Text>
            </GlowCard>}

            <GlowCard index={6} tint={page.to}>
              <Text style={fonts.title}>{data.listTitle}</Text>
              {data.rows.length === 0 ? (
                <Text style={[fonts.small, { marginTop: 8, lineHeight: 19 }]}>{data.empty}</Text>
              ) : data.rows.map((row, i) => (
                <View key={`${row.title}-${i}`} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{row.title}</Text>
                    <Text style={styles.rowDetail} numberOfLines={1}>{row.detail}</Text>
                  </View>
                  {row.badge && <Text style={[styles.badge, { color: page.to, borderColor: `${page.to}66`, backgroundColor: `${page.to}22` }]}>{row.badge}</Text>}
                </View>
              ))}
            </GlowCard>

            <Text style={styles.section} accessibilityRole="header">Your {page.title.toLowerCase()} tools</Text>
            <View style={styles.grid}>
              {page.tools.map((tool, i) => i < 2 ? (
                <GlowCard key={tool.label} index={7 + i} tint={tool.tint} onPress={() => go(tool.to)} label={`${tool.label}. ${tool.detail}`} slot={styles.tool} style={{ backgroundColor: `${tool.tint}1F`, borderColor: `${tool.tint}77` }}>
                  <View style={[styles.toolIcon, { backgroundColor: tool.tint, borderColor: tool.tint }]}><Text style={{ fontSize: 24 }}>{tool.icon}</Text></View>
                  <Text style={styles.toolLabel}>{tool.label}</Text>
                  <Text style={styles.toolDetail} numberOfLines={2}>{tool.detail}</Text>
                </GlowCard>
              ) : (
                <GlowCard key={tool.label} index={7 + i} tint={tool.tint} onPress={() => go(tool.to)} label={`${tool.label}. ${tool.detail}`} slot={styles.tool} style={styles.toolSmall}>
                  <Text style={{ fontSize: 19 }}>{tool.icon}</Text>
                  <Text style={styles.toolSmallLabel} numberOfLines={1}>{tool.label}</Text>
                </GlowCard>
              ))}
            </View>
          </>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: 'rgba(255,255,255,0.72)' },
  title: { fontFamily: display.heavy, fontSize: 44, color: colors.white, letterSpacing: -1, marginTop: 6, lineHeight: 50 },
  heroIcon: { fontSize: 52, transform: [{ rotate: '-6deg' }] },
  tagline: { fontSize: 15, lineHeight: 21, color: 'rgba(255,255,255,0.74)', marginTop: 8 },
  action: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 12, marginTop: spacing.lg },
  actionText: { fontSize: 14, fontWeight: '800', color: '#04091A' },
  switcher: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.lg },
  pill: { borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  pillOn: { backgroundColor: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.38)' },
  pillText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  link: { fontSize: 14, fontWeight: '700', marginTop: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { flexBasis: '47%', flexGrow: 1, minWidth: 140 },
  statLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  statRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8, marginBottom: 6 },
  statValue: { fontFamily: display.heavy, fontSize: 32, color: colors.white, letterSpacing: -0.8 },
  statSuffix: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.45)', marginLeft: 4 },
  statHint: { fontSize: 12.5, lineHeight: 17, color: 'rgba(255,255,255,0.5)' },
  cardEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  nextTitle: { fontFamily: display.heavy, fontSize: 23, color: colors.white, letterSpacing: -0.4, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.white },
  rowDetail: { fontSize: 12.5, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  badge: { fontSize: 12, fontWeight: '700', borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden' },
  section: { fontFamily: display.heavy, fontSize: 18, color: colors.white, letterSpacing: -0.2, marginTop: spacing.sm },
  tool: { flexBasis: '47%', flexGrow: 1, minWidth: 140 },
  toolSmall: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  toolSmallLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.white },
  toolIcon: { width: 50, height: 50, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  toolLabel: { fontFamily: display.heavy, fontSize: 16, color: colors.white, marginTop: 12 },
  toolDetail: { fontSize: 12.5, lineHeight: 17, color: 'rgba(255,255,255,0.5)', marginTop: 3 },
});

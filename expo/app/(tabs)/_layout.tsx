import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRoles } from '../../hooks/useRoles';
import { Wide, WideWithSwipeBack } from '../../components/Wide';
import { PILLARS } from '../../lib/pillars';
import { playsCricket } from '../../lib/menu';
import { colors } from '../../constants/theme';

// The footer: Home, then the four pillars, each in its own colour. Every other tab screen stays
// in the navigator so it can be opened from Home and from the pillars.
const HIDDEN = ['coaching', 'shifts', 'games', 'profile', 'coaches', 'wallet', 'marketplace', 'companion'];

export default function TabsLayout() {
  const { isAdmin, juniors, approvalQueue, active } = useRoles();
  // The player side and the club side are apart: players get the four pillars, a club admin gets
  // the Club tab, and an admin who also plays gets both.
  const playerSide = playsCricket(active);
  // What is waiting for this person in Community: members to approve, children's consents
  const waiting = juniors.filter((j) => j.link_status === 'pending' || !j.consent_given).length;

  return (
    <Tabs
      // Back returns to the tab you were on before, not always to Home
      backBehavior="history"
      // On an iPad each page sits in a centred column. Every page but Home also goes back on a
      // swipe in from the left edge.
      screenLayout={({ children, route }) =>
        route.name === 'index' ? <Wide>{children}</Wide> : <WideWithSwipeBack>{children}</WideWithSwipeBack>}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandSky,
        tabBarInactiveTintColor: colors.textMuted as string,
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '600' },
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border as string },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home Ground', tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }} />
      {PILLARS.map((pillar) => (
        <Tabs.Screen
          key={pillar.tab}
          name={pillar.tab}
          options={{
            ...(playerSide ? {} : { href: null }),
            title: pillar.title,
            tabBarActiveTintColor: pillar.from,
            tabBarIcon: ({ color, size }) => <Ionicons name={pillar.icon} color={color} size={size} />,
            ...(pillar.key === 'community' && waiting > 0 ? { tabBarBadge: waiting } : {}),
          }}
        />
      ))}
      <Tabs.Screen
        name="club"
        options={{
          // Only for the club admin. Players reach their club from Pavilion.
          ...(isAdmin ? {} : { href: null }),
          title: 'Club',
          tabBarActiveTintColor: '#F87171',
          tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark" color={color} size={size} />,
          ...(isAdmin && approvalQueue.length > 0 ? { tabBarBadge: approvalQueue.length } : {}),
        }}
      />
      {HIDDEN.map((name) => <Tabs.Screen key={name} name={name} options={{ href: null }} />)}
    </Tabs>
  );
}

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRoles } from '../../hooks/useRoles';
import { Wide, WideWithSwipeBack } from '../../components/Wide';
import { PILLARS } from '../../lib/pillars';
import { colors } from '../../constants/theme';

// The footer: Home, then the four pillars, each in its own colour. Every other tab screen stays
// in the navigator so it can be opened from Home and from the pillars.
const HIDDEN = ['coaching', 'shifts', 'games', 'club', 'profile', 'coaches', 'wallet', 'marketplace', 'companion'];

export default function TabsLayout() {
  const { isAdmin, juniors, approvalQueue } = useRoles();
  // What is waiting for this person in Community: members to approve, children's consents
  const waiting = (isAdmin ? approvalQueue.length : 0) + juniors.filter((j) => j.link_status === 'pending' || !j.consent_given).length;

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
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }} />
      {PILLARS.map((pillar) => (
        <Tabs.Screen
          key={pillar.tab}
          name={pillar.tab}
          options={{
            title: pillar.title,
            tabBarActiveTintColor: pillar.from,
            tabBarIcon: ({ color, size }) => <Ionicons name={pillar.icon} color={color} size={size} />,
            ...(pillar.key === 'community' && waiting > 0 ? { tabBarBadge: waiting } : {}),
          }}
        />
      ))}
      {HIDDEN.map((name) => <Tabs.Screen key={name} name={name} options={{ href: null }} />)}
    </Tabs>
  );
}

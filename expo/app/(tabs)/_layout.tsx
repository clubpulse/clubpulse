import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRoles } from '../../hooks/useRoles';
import { Wide, WideWithSwipeBack } from '../../components/Wide';
import { colors } from '../../constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// Every tab screen. Only five are shown in the bar at a time; the rest stay in the navigator so
// they can be opened from Home and the menu.
const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index',       title: 'Home',     icon: 'home' },
  { name: 'coaching',    title: 'Coaching', icon: 'videocam' },
  { name: 'shifts',      title: 'Shifts',   icon: 'calendar' },
  { name: 'games',       title: 'Games',    icon: 'game-controller' },
  { name: 'club',        title: 'Club',     icon: 'shield' },
  { name: 'profile',     title: 'Profile',  icon: 'person' },
  { name: 'coaches',     title: 'Coaches',  icon: 'people' },
  { name: 'wallet',      title: 'Wallet',   icon: 'wallet' },
  { name: 'marketplace', title: 'Market',   icon: 'storefront' },
  { name: 'companion',   title: 'Coach AI', icon: 'chatbubbles' },
];

export default function TabsLayout() {
  const { active, isAdmin, isCoach, isPlayer } = useRoles();
  // Players, coaches and admins get Coaching in the bar. Someone who is only a parent or a
  // volunteer gets Shifts there, which is what they come for. Anyone with no role yet is
  // treated as a player.
  const plays = isPlayer || isCoach || isAdmin || active.length === 0;
  const shown = new Set(['index', plays ? 'coaching' : 'shifts', 'games', 'club', 'profile']);

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
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border as string },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => <Ionicons name={tab.icon} color={color} size={size} />,
            ...(shown.has(tab.name) ? {} : { href: null }),
          }}
        />
      ))}
    </Tabs>
  );
}

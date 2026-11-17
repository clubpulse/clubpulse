import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index',       title: 'Home',     icon: 'home' },
  { name: 'club',        title: 'Club',     icon: 'shield' },
  { name: 'coaches',     title: 'Coaches',  icon: 'people' },
  { name: 'shifts',      title: 'Shifts',   icon: 'calendar' },
  { name: 'profile',     title: 'Profile',  icon: 'person' },
  // Keep these as hidden tab screens so they stay in the tab navigator stack
  { name: 'wallet',      title: 'Wallet',   icon: 'wallet' },
  { name: 'marketplace', title: 'Market',   icon: 'storefront' },
  { name: 'companion',   title: 'Coach AI', icon: 'chatbubbles' },
];

export default function TabsLayout() {
  return (
    <Tabs
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
            // Hide wallet, marketplace and companion from the bottom tab bar
            ...((['wallet', 'marketplace', 'companion'] as string[]).includes(tab.name)
              ? { href: null }
              : {}),
          }}
        />
      ))}
    </Tabs>
  );
}

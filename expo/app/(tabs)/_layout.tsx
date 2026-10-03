import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index',       title: 'Home',    icon: 'home' },
  { name: 'wallet',      title: 'Wallet',  icon: 'wallet' },
  { name: 'marketplace', title: 'Market',  icon: 'storefront' },
  { name: 'companion',   title: 'Coach',   icon: 'chatbubbles' },
  { name: 'profile',     title: 'Profile', icon: 'person' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.navy, borderTopColor: colors.navyBorder },
        sceneStyle: { backgroundColor: colors.navy },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => <Ionicons name={tab.icon} color={color} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}

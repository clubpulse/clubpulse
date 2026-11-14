import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index',      title: 'Home',       icon: 'home' },
  { name: 'match',      title: 'Match',      icon: 'cricket-bat-ball' as IconName },
  { name: 'clubwatch',  title: 'ClubWatch',  icon: 'camera' },
  { name: 'game',       title: 'My Game',    icon: 'analytics' },
  { name: 'scores',     title: 'Scores',     icon: 'star' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.navy,
          borderTopColor: colors.navyBorder,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 56,
        },
        sceneStyle: { backgroundColor: colors.navy },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => {
              // Ionicons doesn't have a cricket icon, use a bat emoji for Match
              if (tab.name === 'match') {
                return (
                  <Ionicons name="calendar" color={color} size={size} />
                );
              }
              return <Ionicons name={tab.icon} color={color} size={size} />;
            },
          }}
        />
      ))}
      {/* Hidden screens accessible via navigation but not shown in tab bar */}
      <Tabs.Screen name="play" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="admin" options={{ href: null }} />
      <Tabs.Screen name="wallet" options={{ href: null }} />
      <Tabs.Screen name="companion" options={{ href: null }} />
      <Tabs.Screen name="marketplace" options={{ href: null }} />
    </Tabs>
  );
}

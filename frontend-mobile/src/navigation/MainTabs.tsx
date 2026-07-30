import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { Home, Search, Heart, User } from 'lucide-react-native';
import { AccountScreen } from '../screens/account/AccountScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { SavedScreen } from '../screens/saved/SavedScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { ChatbotFAB } from '../components/ChatbotFAB';
import { useTheme } from '../context/ThemeContext';
import { useT } from '../context/LanguageContext';
import { spacing } from '../theme/spacing';
import type { MainTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();

const iconMap = {
  Home,
  Search,
  Saved: Heart,
  Account: User,
} as const;

export function MainTabs() {
  const { colors } = useTheme();
  const { t } = useT();

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, size }) => {
            const Icon = iconMap[route.name as keyof typeof iconMap];
            const color = focused ? colors.primary : colors.textMuted;
            return <Icon size={size} color={color} />;
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            borderTopColor: colors.border,
            backgroundColor: colors.white,
            paddingTop: spacing.xs,
          },
        })}>
        <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t('tabs.home') }} />
        <Tab.Screen name="Search" component={SearchScreen} options={{ tabBarLabel: t('tabs.search') }} />
        <Tab.Screen name="Saved" component={SavedScreen} options={{ tabBarLabel: t('tabs.saved') }} />
        <Tab.Screen name="Account" component={AccountScreen} options={{ tabBarLabel: t('tabs.profile') }} />
      </Tab.Navigator>
      <ChatbotFAB />
    </View>
  );
}

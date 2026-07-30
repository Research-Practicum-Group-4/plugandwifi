import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignupScreen } from '../screens/auth/SignupScreen';
import { CheckoutScreen } from '../screens/checkout/CheckoutScreen';
import { NotFoundScreen } from '../screens/NotFoundScreen';
import { SettingsScreen } from '../screens/account/SettingsScreen';
import { ChatbotScreen } from '../screens/chatbot/ChatbotScreen';
import { VenueDetailScreen } from '../screens/venue/VenueDetailScreen';
import { useTheme } from '../context/ThemeContext';
import type { RootStackParamList } from '../types/navigation';
import { MainTabs } from './MainTabs';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { colors } = useTheme();

  const screenOptions = {
    headerStyle: { backgroundColor: colors.white },
    headerTintColor: colors.primaryDark,
    headerTitleStyle: { fontWeight: '600' as const },
    contentStyle: { backgroundColor: colors.background },
  };

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="VenueDetail" component={VenueDetailScreen} options={{ title: 'Venue Details', headerShown: false }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout', headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Sign In', headerShown: false }} />
      <Stack.Screen name="Signup" component={SignupScreen} options={{ title: 'Create Account', headerShown: false }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings', headerShown: false }} />
      <Stack.Screen name="Chatbot" component={ChatbotScreen} options={{ title: 'AI Assistant', headerShown: false }} />
      <Stack.Screen name="NotFound" component={NotFoundScreen} options={{ title: 'Not Found' }} />
    </Stack.Navigator>
  );
}

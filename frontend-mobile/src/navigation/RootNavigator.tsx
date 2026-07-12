import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignupScreen } from '../screens/auth/SignupScreen';
import { CheckoutScreen } from '../screens/checkout/CheckoutScreen';
import { NotFoundScreen } from '../screens/NotFoundScreen';
import { OfferSpaceScreen } from '../screens/provider/OfferSpaceScreen';
import { ProviderDashboardScreen } from '../screens/provider/ProviderDashboardScreen';
import { VenueDetailScreen } from '../screens/venue/VenueDetailScreen';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../types/navigation';
import { MainTabs } from './MainTabs';

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: colors.white },
  headerTintColor: colors.primaryDark,
  headerTitleStyle: { fontWeight: '600' as const },
  contentStyle: { backgroundColor: colors.background },
};

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="VenueDetail"
        component={VenueDetailScreen}
        options={{ title: 'Venue Details' }}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ title: 'Checkout' }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: 'Sign In' }}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{ title: 'Create Account' }}
      />
      <Stack.Screen
        name="ProviderDashboard"
        component={ProviderDashboardScreen}
        options={{ title: 'Provider Dashboard' }}
      />
      <Stack.Screen
        name="OfferSpace"
        component={OfferSpaceScreen}
        options={{ title: 'List Your Space' }}
      />
      <Stack.Screen
        name="NotFound"
        component={NotFoundScreen}
        options={{ title: 'Not Found' }}
      />
    </Stack.Navigator>
  );
}

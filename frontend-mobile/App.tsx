import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { FavoriteProvider, useFavorites } from './src/context/FavoriteContext';
import { AlertProvider } from './src/context/AlertContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { RootNavigator } from './src/navigation/RootNavigator';

function AppContent() {
  const { isDark } = useTheme();
  const { isAuthenticated, token } = useAuth();
  const { syncFromServer } = useFavorites();

  useEffect(() => {
    if (isAuthenticated && token) {
      syncFromServer(token);
    }
  }, [isAuthenticated, token, syncFromServer]);

  return (
    <NavigationContainer>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <RootNavigator />
    </NavigationContainer>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <AlertProvider>
              <FavoriteProvider>
                <AppContent />
              </FavoriteProvider>
            </AlertProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;

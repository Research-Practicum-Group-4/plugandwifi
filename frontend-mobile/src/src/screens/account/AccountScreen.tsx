import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Settings, ArrowRight, Building } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { MainTabScreenProps } from '../../types/navigation';

export function AccountScreen({ navigation }: MainTabScreenProps<'Account'>) {
  const { user, isAuthenticated, logout } = useAuth();

  async function handleLogout() {
    await logout();
  }

  if (isAuthenticated && user) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <View style={styles.header}>
            <View />
            <Pressable style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')} hitSlop={16}>
              <Settings size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.full_name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.userName}>{user.full_name}</Text>

            <View style={styles.bookingsSection}>
              <View style={styles.bookingsTabs}>
                <Pressable style={[styles.tab, styles.tabActive]}>
                  <Text style={[styles.tabText, styles.tabTextActive]}>Upcoming</Text>
                </Pressable>
                <Pressable style={styles.tab}>
                  <Text style={styles.tabText}>Past</Text>
                </Pressable>
              </View>
              <View style={styles.emptyBookings}>
                <Text style={styles.emptyBookingsIcon}>📋</Text>
                <Text style={styles.emptyBookingsTitle}>No bookings yet</Text>
                <Text style={styles.emptyBookingsDesc}>Find a workspace and book your first session</Text>
                <PrimaryButton label="Browse Workspaces" onPress={() => navigation.navigate('Home')} />
              </View>
            </View>

            <PrimaryButton label="Sign Out" variant="outline" onPress={handleLogout} />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <View />
          <Pressable style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')} hitSlop={16}>
            <Settings size={24} color={colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
          <View style={styles.greeting}>
            <Text style={styles.greetingTitle}>Find Your Workspace</Text>
            <Text style={styles.greetingSubtitle}>
              Sign in to book workspaces, save your favorites, and manage your reservations.
            </Text>
          </View>

          <PrimaryButton label="Sign In" onPress={() => navigation.navigate('Login')} />

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account?</Text>
            <Pressable onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signupLink}>Sign up</Text>
            </Pressable>
          </View>

          <View style={styles.providerCard}>
            <Building size={20} color={colors.primary} />
            <View style={styles.providerInfo}>
              <Text style={styles.providerTitle}>Offer your space?</Text>
              <Text style={styles.providerDesc}>List your venue and start hosting workspace seekers.</Text>
            </View>
            <Pressable onPress={() => Linking.openURL('https://plugandwifi.xyz/provider')}>
              <ArrowRight size={18} color={colors.primary} />
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Plug & Wifi</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs,
  },
  settingsBtn: { padding: 4 },
  body: { flex: 1 },
  bodyContent: { padding: spacing.lg, gap: spacing.md },
  greeting: { alignItems: 'center', marginBottom: spacing.md },
  greetingTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  greetingSubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22, marginTop: spacing.sm },
  signupRow: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  signupText: { fontSize: 14, color: colors.textMuted },
  signupLink: { fontSize: 14, fontWeight: '600', color: colors.primary },
  providerCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.white, borderRadius: 14, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  providerInfo: { flex: 1 },
  providerTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  providerDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 18, marginTop: 2 },
  footer: { alignItems: 'center', marginTop: spacing.xl },
  footerText: { fontSize: 13, color: colors.textMuted },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  avatarText: { color: colors.white, fontSize: 28, fontWeight: '700' },
  userName: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: spacing.md },
  bookingsSection: { gap: spacing.md },
  bookingsTabs: { flexDirection: 'row', gap: spacing.sm },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: 8, backgroundColor: colors.surface },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.white },
  emptyBookings: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm, backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  emptyBookingsIcon: { fontSize: 32 },
  emptyBookingsTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  emptyBookingsDesc: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
});

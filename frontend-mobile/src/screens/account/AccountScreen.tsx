import { StyleSheet, Text, View } from 'react-native';
import { ClipboardList } from 'lucide-react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SectionHeader } from '../../components/SectionHeader';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { MainTabScreenProps } from '../../types/navigation';

export function AccountScreen({ navigation }: MainTabScreenProps<'Account'>) {
  const { user, isAuthenticated, logout } = useAuth();

  async function handleLogout() {
    await logout();
  }

  return (
    <ScreenContainer>
      <SectionHeader
        title="Account"
        subtitle="Sign in, switch roles, or access provider tools"
      />

      {isAuthenticated && user ? (
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{user.full_name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>
      ) : null}

      {/* ── My Bookings ── */}
      {isAuthenticated ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Bookings</Text>
          <View style={styles.bookingEmpty}>
            <ClipboardList size={28} color={colors.textMuted} />
            <Text style={styles.bookingEmptyTitle}>No bookings yet</Text>
            <Text style={styles.bookingEmptyDesc}>
              Your upcoming work sessions will appear here.
            </Text>
          </View>
        </View>
      ) : null}

      {/* ── Actions ── */}
      <View style={styles.menu}>
        {isAuthenticated ? (
          <PrimaryButton label="Sign Out" variant="outline" onPress={handleLogout} />
        ) : (
          <>
            <PrimaryButton label="Sign In" onPress={() => navigation.navigate('Login')} />
            <PrimaryButton
              label="Create Account"
              variant="outline"
              onPress={() => navigation.navigate('Signup')}
            />
          </>
        )}

        <PrimaryButton
          label="Provider Dashboard"
          variant="secondary"
          onPress={() => navigation.navigate('ProviderDashboard')}
        />
        <PrimaryButton
          label="List Your Space"
          variant="outline"
          onPress={() => navigation.navigate('OfferSpace')}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Plug & Wifi — Find your perfect workspace</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '700',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  userEmail: {
    color: colors.textMuted,
    fontSize: 14,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  bookingEmpty: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    gap: spacing.sm,
  },
  bookingEmptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  bookingEmptyDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  menu: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  footerText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
});

import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SectionHeader } from '../../components/SectionHeader';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackScreenProps } from '../../types/navigation';

const stats = [
  { label: 'Total Bookings', value: '127', change: '+12%' },
  { label: 'Revenue', value: '$3,048', change: '+8%' },
  { label: 'Occupancy', value: '68%', change: '+5%' },
];

export function ProviderDashboardScreen({
  navigation,
}: RootStackScreenProps<'ProviderDashboard'>) {
  return (
    <ScreenContainer>
      <SectionHeader
        title="Provider Dashboard"
        subtitle="Manage your spaces, bookings, and availability"
      />

      <View style={styles.statsRow}>
        {stats.map(item => (
          <View key={item.label} style={styles.statCard}>
            <Text style={styles.statLabel}>{item.label}</Text>
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statChange}>{item.change}</Text>
          </View>
        ))}
      </View>

      <PrimaryButton
        label="List Your Space"
        onPress={() => navigation.navigate('OfferSpace')}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
        <View style={styles.bookingCard}>
          <Text style={styles.bookingTitle}>The Grand Hotel Lobby</Text>
          <Text style={styles.bookingMeta}>Today • 2:00 PM – 4:00 PM</Text>
          <Text style={styles.bookingMeta}>Guest: Sunmin Lee</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Spaces</Text>
        <View style={styles.bookingCard}>
          <Text style={styles.bookingTitle}>Cafe Moderna</Text>
          <Text style={styles.bookingMeta}>Capacity: 12 desks</Text>
          <Text style={styles.bookingMeta}>Today's Bookings: 4</Text>
          <PrimaryButton label="View Details" variant="outline" />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  statChange: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  bookingCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: colors.white,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  bookingMeta: {
    color: colors.textMuted,
  },
});

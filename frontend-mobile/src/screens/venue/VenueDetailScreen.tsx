import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SectionHeader } from '../../components/SectionHeader';
import { getVenueById } from '../../data/mockVenues';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackScreenProps } from '../../types/navigation';

export function VenueDetailScreen({
  navigation,
  route,
}: RootStackScreenProps<'VenueDetail'>) {
  const venue = getVenueById(route.params.venueId);

  if (!venue) {
    return (
      <ScreenContainer>
        <SectionHeader title="Venue Not Found" subtitle="This venue does not exist." />
        <PrimaryButton label="Go Back" onPress={() => navigation.goBack()} />
      </ScreenContainer>
    );
  }

  const price = venue.hourly_price ?? 0;
  const ratingText = venue.rating ? `★ ${venue.rating}` : '';

  return (
    <ScreenContainer>
      <View style={styles.heroPlaceholder}>
        <Text style={styles.heroLabel}>
          {venue.cuisine_type ?? venue.borough}
        </Text>
      </View>

      <SectionHeader title={venue.name} subtitle={ratingText} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        {venue.cuisine_type ? (
          <Text style={styles.bodyText}>Type: {venue.cuisine_type}</Text>
        ) : null}
        {venue.borough ? (
          <Text style={styles.bodyText}>Borough: {venue.borough}</Text>
        ) : null}
        {venue.calls_allowed ? (
          <Text style={styles.bodyText}>Calls allowed</Text>
        ) : null}
        {venue.opening_hours_summary ? (
          <Text style={styles.bodyText}>Hours: {venue.opening_hours_summary}</Text>
        ) : null}
        {venue.distance_km != null ? (
          <Text style={styles.bodyText}>Distance: {venue.distance_km.toFixed(1)} km</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Amenities</Text>
        {venue.has_wifi ? (
          <Text style={styles.bodyText}>High-Speed WiFi ✓</Text>
        ) : null}
        {venue.plug_access != null && venue.plug_access > 0 ? (
          <Text style={styles.bodyText}>Power Outlets ({venue.plug_access})</Text>
        ) : null}
      </View>

      <View style={styles.bookingCard}>
        <Text style={styles.sectionTitle}>Book Your Workspace</Text>
        <Text style={styles.price}>${price}/hour</Text>
        <Text style={styles.meta}>Select Duration: 1h / 2h / 3h</Text>
        <PrimaryButton
          label="Continue to Checkout"
          variant="secondary"
          onPress={() =>
            navigation.navigate('Checkout', {
              venueId: venue.venue_id,
              venueName: venue.name,
              duration: '2',
              price: price * 2,
            })
          }
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heroPlaceholder: {
    height: 180,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroLabel: {
    color: colors.textMuted,
    fontSize: 16,
  },
  section: {
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  bodyText: {
    color: colors.textMuted,
    lineHeight: 22,
  },
  bookingCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  meta: {
    color: colors.textMuted,
  },
});

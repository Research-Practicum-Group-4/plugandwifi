import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SectionHeader } from '../../components/SectionHeader';
import { VenueCard } from '../../components/VenueCard';
import { mockVenues } from '../../data/mockVenues';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { MainTabScreenProps } from '../../types/navigation';

export function SavedScreen({ navigation }: MainTabScreenProps<'Saved'>) {
  const savedVenues = mockVenues.slice(0, 1);

  return (
    <ScreenContainer>
      <SectionHeader
        title="Saved & Alerts"
        subtitle="Your favorite workspaces and availability alerts"
      />

      {savedVenues.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No saved places yet</Text>
          <Text style={styles.emptySubtitle}>
            Start saving your favorite workspaces
          </Text>
          <PrimaryButton
            label="Browse Spaces"
            onPress={() => navigation.navigate('Search')}
          />
        </View>
      ) : (
        <>
          {savedVenues.map(venue => (
            <VenueCard
              key={venue.venue_id}
              venue={venue}
              onPress={() =>
                navigation.navigate('VenueDetail', { venueId: venue.venue_id })
              }
            />
          ))}

          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>Create New Alert</Text>
            <Text style={styles.alertBody}>
              Get notified when a workspace matching your filters becomes available.
            </Text>
            <PrimaryButton label="Venue Alert" variant="outline" />
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtitle: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  alertCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  alertBody: {
    color: colors.textMuted,
    lineHeight: 20,
  },
});

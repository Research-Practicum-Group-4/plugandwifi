import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { VenueItem } from '../types/venue';
import { getVenueImage } from '../utils/venueImages';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type VenueCardProps = {
  venue: VenueItem;
  compact?: boolean;
  onPress?: () => void;
  onBook?: () => void;
};

export function VenueCard({ venue, compact = false, onPress, onBook }: VenueCardProps) {
  const distanceText = venue.distance_km != null
    ? `${venue.distance_km.toFixed(1)} km`
    : null;

  const price = venue.hourly_price ?? venue.hourly_fee;

  return (
    <Pressable
      style={[styles.card, compact && styles.cardCompact]}
      onPress={onPress}
    >
      <Image source={{ uri: getVenueImage(venue) }} style={compact ? styles.imageCompact : styles.image} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>{venue.name}</Text>
          {venue.rating ? (
            <Text style={styles.rating}>★ {venue.rating}</Text>
          ) : null}
        </View>
        <View style={styles.metaRow}>
          {venue.cuisine_type ? (
            <Text style={styles.meta}>{venue.cuisine_type}</Text>
          ) : null}
          {distanceText ? (
            <Text style={styles.meta}> • {distanceText}</Text>
          ) : null}
        </View>
        <View style={styles.tagsRow}>
          {venue.has_wifi ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>WiFi</Text>
            </View>
          ) : null}
          {venue.plug_access != null && venue.plug_access > 0 ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>Plugs ✓</Text>
            </View>
          ) : null}
          {venue.noise_level ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{venue.noise_level}</Text>
            </View>
          ) : null}
        </View>
        {price != null ? (
          <View style={styles.footerRow}>
            <Text style={styles.price}>${price}/hr</Text>
            <Pressable style={styles.bookButton} onPress={onBook}>
              <Text style={styles.bookButtonText}>Book</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  cardCompact: {
    width: 240,
    marginRight: spacing.sm,
    marginBottom: 0,
  },
  image: {
    height: 140,
    width: '100%',
  },
  imageCompact: {
    height: 120,
    width: '100%',
  },
  body: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  rating: {
    fontSize: 14,
    color: colors.star,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    backgroundColor: colors.surface,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  bookButton: {
    backgroundColor: colors.primaryDark,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  bookButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 13,
  },
});

import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Heart, Bell } from 'lucide-react-native';
import type { Venue } from '../types/venue';
import { getVenueImage } from '../utils/venueImages';
import { useFavorites } from '../context/FavoriteContext';
import { useT } from '../context/LanguageContext';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type VenueCardProps = {
  venue: Venue;
  compact?: boolean;
  saved?: boolean;
  alertOn?: boolean;
  onPress?: () => void;
  onBook?: () => void;
  onBell?: () => void;
};

export function VenueCard({ venue, compact = false, saved = false, alertOn = false, onPress, onBook, onBell }: VenueCardProps) {
  const { t } = useT();
  const { toggle, isFav } = useFavorites();
  const favorited = isFav(venue.id);
  const hasWifi = venue.amenities?.includes('WiFi');
  const hasPlugs = venue.amenities?.includes('Power Outlets');
  const isQuiet = venue.amenities?.includes('Quiet Zone');

  if (saved) {
    return (
      <Pressable style={styles.savedCard} onPress={onPress}>
        <View style={styles.imageWrap}>
          <Image source={{ uri: getVenueImage(venue) }} style={styles.savedImage} />
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingBadgeText}>★ {venue.rating}</Text>
          </View>
        </View>
        <View style={styles.savedBody}>
          <View style={styles.savedNameRow}>
            <Text style={styles.savedName} numberOfLines={1}>{venue.name}</Text>
            <View style={styles.savedIcons}>
              {onBell ? (
                <Pressable onPress={onBell} hitSlop={8}>
                  <Bell size={18} color={alertOn ? colors.primary : colors.textMuted} fill={alertOn ? colors.primary : 'transparent'} />
                </Pressable>
              ) : null}
              <Pressable onPress={() => toggle(venue.id)} hitSlop={8}>
                <Heart size={18} color={favorited ? colors.primary : colors.textMuted} fill={favorited ? colors.primary : 'transparent'} />
              </Pressable>
            </View>
          </View>
          <Text style={styles.savedType} numberOfLines={1}>{venue.type}</Text>
          <Text style={styles.savedMeta} numberOfLines={1}>
            {venue.availability}{venue.availability && venue.distance ? '  ·  ' : ''}{venue.distance}
          </Text>
          <View style={styles.savedPriceRow}>
            <Text style={styles.savedPrice}>${venue.price}/hr</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable style={[styles.card, compact && styles.cardCompact]} onPress={onPress}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: getVenueImage(venue) }} style={compact ? styles.imageCompact : styles.image} />
        <View style={styles.imageBtns}>
          {onBell ? (
            <Pressable style={styles.iconBtn} onPress={onBell} hitSlop={8}>
              <Bell size={16} color={alertOn ? colors.primary : colors.white} fill={alertOn ? colors.primary : 'transparent'} />
            </Pressable>
          ) : null}
          <Pressable style={styles.iconBtn} onPress={() => toggle(venue.id)} hitSlop={8}>
            <Heart size={16} color={favorited ? colors.primary : colors.white} fill={favorited ? colors.primary : 'transparent'} />
          </Pressable>
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>{venue.name}</Text>
          <Text style={styles.rating}>★ {venue.rating}</Text>
        </View>
        <Text style={styles.meta}>
          {venue.distance}{venue.distance && venue.availability ? ' • ' : ''}{venue.availability}
        </Text>
        <View style={styles.tagsRow}>
          {hasWifi ? <View style={styles.tag}><Text style={styles.tagText}>{t('common.wifi')}</Text></View> : null}
          {hasPlugs ? <View style={styles.tag}><Text style={styles.tagText}>{t('common.plugs')}</Text></View> : null}
          {isQuiet ? <View style={styles.tag}><Text style={styles.tagText}>{t('common.quiet')}</Text></View> : null}
        </View>
        <View style={styles.footerRow}>
          <Text style={styles.price}>${venue.price}/hr</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    marginBottom: spacing.md, backgroundColor: colors.white, overflow: 'hidden',
  },
  cardCompact: { marginBottom: 0 },
  imageWrap: { position: 'relative' },
  image: { height: 140, width: '100%' },
  imageCompact: { height: 160, width: '100%' },
  imageBtns: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 4 },
  iconBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  body: { padding: spacing.md, gap: spacing.xs },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  name: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  rating: { fontSize: 14, color: colors.star, fontWeight: '600' },
  meta: { color: colors.textMuted, fontSize: 13 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: { backgroundColor: colors.surface, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontSize: 11, color: colors.textMuted },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  price: { fontSize: 16, fontWeight: '700', color: colors.primary },
  bookButton: {
    backgroundColor: colors.primaryDark, borderRadius: 8,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
  },
  bookButtonText: { color: colors.white, fontWeight: '600', fontSize: 13 },
  savedCard: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    marginBottom: spacing.md, backgroundColor: colors.white, overflow: 'hidden',
  },
  savedImage: { height: 200, width: '100%' },
  ratingBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  ratingBadgeText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  savedBody: { padding: spacing.md, gap: 4 },
  savedNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  savedName: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text, marginRight: spacing.sm },
  savedIcons: { flexDirection: 'row', gap: spacing.sm },
  savedType: { fontSize: 13, color: colors.textMuted },
  savedMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  savedPriceRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  savedPrice: { fontSize: 16, fontWeight: '700', color: colors.text },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Heart, Bell, Sparkles } from 'lucide-react-native';
import type { Venue } from '../types/venue';
import { getVenueBackupImage, getVenueImage } from '../utils/venueImages';
import { VenueImage } from './VenueImage';
import { useFavorites } from '../context/FavoriteContext';
import { useAuth } from '../context/AuthContext';
import { useT } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';

type VenueCardProps = {
  venue: Venue;
  compact?: boolean;
  saved?: boolean;
  alertOn?: boolean;
  onPress?: () => void;
  onBell?: () => void;
};

export function VenueCard({ venue, compact = false, saved = false, alertOn = false, onPress, onBell }: VenueCardProps) {
  const { t } = useT();
  const { colors: tc } = useTheme();
  const { toggle, isFav } = useFavorites();
  const { token } = useAuth();
  const favorited = isFav(venue.id);
  const hasWifi = venue.amenities?.includes('WiFi');
  const hasPlugs = venue.amenities?.includes('Power Outlets');
  const isQuiet = venue.amenities?.includes('Quiet Zone');

  if (saved) {
    return (
      <Pressable style={[S.savedCard, { backgroundColor: tc.white, borderColor: tc.border }]} onPress={onPress}>
        <View style={S.imageWrap}>
          <VenueImage uri={getVenueImage(venue)} fallbackUri={getVenueBackupImage(venue)} style={S.savedImage} />
          <View style={[S.ratingBadge, { backgroundColor: tc.primary }]}>
            <Text style={S.ratingBadgeText}>★ {venue.rating}</Text>
          </View>
        </View>
        <View style={S.savedBody}>
          <View style={S.savedNameRow}>
            <Text style={[S.savedName, { color: tc.text }]} numberOfLines={1}>{venue.name}</Text>
            <View style={S.savedIcons}>
              {onBell ? (
                <Pressable onPress={event => { event.stopPropagation(); onBell(); }} hitSlop={8}>
                  <Bell size={18} color={alertOn ? tc.primary : tc.textMuted} fill={alertOn ? tc.primary : 'transparent'} />
                </Pressable>
              ) : null}
              <Pressable onPress={event => { event.stopPropagation(); toggle(venue.id, token ?? undefined); }} hitSlop={8}>
                <Heart size={18} color={favorited ? tc.primary : tc.textMuted} fill={favorited ? tc.primary : 'transparent'} />
              </Pressable>
            </View>
          </View>
          <Text style={[S.savedType, { color: tc.textMuted }]} numberOfLines={1}>{venue.type}</Text>
          <Text style={[S.savedMeta, { color: tc.textMuted }]} numberOfLines={1}>
            {venue.availability}{venue.availability && venue.distance ? '  ·  ' : ''}{venue.distance}
          </Text>
          <View style={S.savedPriceRow}>
            <Text style={[S.savedPrice, { color: tc.text }]}>${venue.price}/hr</Text>
            {venue.suitabilityScore != null ? (
              <View style={[S.suitabilityInline, { backgroundColor: tc.primary + '18' }]}>
                <Sparkles size={13} color={tc.primary} />
                <View>
                  <Text style={[S.matchBadgeLabel, { color: tc.textMuted }]}>{t('venue.workspaceSuitability')}</Text>
                  <Text style={[S.matchBadgeText, { color: tc.primary }]}>{venue.suitabilityScore}% {t('common.match')}</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable style={[S.card, { borderColor: tc.border, backgroundColor: tc.white }, compact && S.cardCompact]} onPress={onPress}>
      <View style={S.imageWrap}>
        <VenueImage uri={getVenueImage(venue)} fallbackUri={getVenueBackupImage(venue)} style={compact ? S.imageCompact : S.image} />
        <View style={S.imageBtns}>
          {onBell ? (
            <Pressable style={S.iconBtn} onPress={event => { event.stopPropagation(); onBell(); }} hitSlop={8}>
              <Bell size={16} color={alertOn ? tc.primary : '#fff'} fill={alertOn ? tc.primary : 'transparent'} />
            </Pressable>
          ) : null}
          <Pressable style={S.iconBtn} onPress={event => { event.stopPropagation(); toggle(venue.id, token ?? undefined); }} hitSlop={8}>
            <Heart size={16} color={favorited ? tc.primary : '#fff'} fill={favorited ? tc.primary : 'transparent'} />
          </Pressable>
        </View>
      </View>
      <View style={S.body}>
        <View style={S.headerRow}>
          <Text style={[S.name, { color: tc.text }]} numberOfLines={1}>{venue.name}</Text>
          <Text style={[S.rating, { color: tc.star }]}>★ {venue.rating}</Text>
        </View>
        {venue.distance !== '—' || venue.availability !== 'Varies' ? (
          <Text style={[S.meta, { color: tc.textMuted }]}>
            {venue.distance !== '—' ? venue.distance : ''}
            {venue.distance !== '—' && venue.availability !== 'Varies' ? ' • ' : ''}
            {venue.availability !== 'Varies' ? venue.availability : ''}
          </Text>
        ) : null}
        <View style={S.tagsRow}>
          {hasWifi ? <View style={[S.tag, { backgroundColor: tc.surface }]}><Text style={[S.tagText, { color: tc.textMuted }]}>{t('common.wifi')}</Text></View> : null}
          {hasPlugs ? <View style={[S.tag, { backgroundColor: tc.surface }]}><Text style={[S.tagText, { color: tc.textMuted }]}>{t('common.plugs')}</Text></View> : null}
          {isQuiet ? <View style={[S.tag, { backgroundColor: tc.surface }]}><Text style={[S.tagText, { color: tc.textMuted }]}>{t('common.quiet')}</Text></View> : null}
        </View>
        <View style={S.footerRow}>
          <Text style={[S.price, { color: tc.primary }]}>${venue.price}/hr</Text>
          {venue.suitabilityScore != null ? (
            <View style={[S.suitabilityInline, { backgroundColor: tc.primary + '18' }]}>
              <Sparkles size={13} color={tc.primary} />
              <View>
                <Text style={[S.matchBadgeLabel, { color: tc.textMuted }]}>{t('venue.workspaceSuitability')}</Text>
                <Text style={[S.matchBadgeText, { color: tc.primary }]}>{venue.suitabilityScore}% {t('common.match')}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const S = StyleSheet.create({
  card: {
    borderWidth: 1, borderRadius: 12,
    marginBottom: spacing.md, overflow: 'hidden',
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
  name: { flex: 1, fontSize: 15, fontWeight: '600' },
  rating: { fontSize: 14, fontWeight: '600' },
  meta: { fontSize: 13 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontSize: 11 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  price: { fontSize: 16, fontWeight: '700' },
  savedCard: {
    borderWidth: 1, borderRadius: 12,
    marginBottom: spacing.md, overflow: 'hidden',
  },
  savedImage: { height: 200, width: '100%' },
  ratingBadge: {
    position: 'absolute', top: 10, right: 10,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  ratingBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  suitabilityInline: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  matchBadgeLabel: { fontSize: 10, fontWeight: '500' },
  matchBadgeText: { fontSize: 12, fontWeight: '700' },
  savedBody: { padding: spacing.md, gap: 4 },
  savedNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  savedName: { flex: 1, fontSize: 16, fontWeight: '700', marginRight: spacing.sm },
  savedIcons: { flexDirection: 'row', gap: spacing.sm },
  savedType: { fontSize: 13 },
  savedMeta: { fontSize: 13, marginTop: 2 },
  savedPriceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  savedPrice: { fontSize: 16, fontWeight: '700' },
});

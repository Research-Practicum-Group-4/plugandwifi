import { useState, useEffect } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Heart, Bell, MapPin, ChevronLeft, Wifi, Plug, Clock, Navigation, Star, Phone, Globe, Train, Bus } from 'lucide-react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { fetchVenueById, type VenueDetail } from '../../services/venues';
import { getVenueById } from '../../data/mockVenues';
import { getVenueImage } from '../../utils/venueImages';
import { useFavorites } from '../../context/FavoriteContext';
import { useAlerts } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../context/LanguageContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackScreenProps } from '../../types/navigation';
import type { Venue } from '../../types/venue';

function buildAddress(d: VenueDetail | null, fallback: string): string {
  if (!d) return fallback;
  const parts: string[] = [];
  if (d.building_number) parts.push(d.building_number);
  if (d.street) parts.push(d.street);
  if (d.borough) parts.push(d.borough);
  if (d.zipcode) parts.push(d.zipcode);
  return parts.length > 0 ? parts.join(', ') : fallback;
}

function formatBestHours(raw: string | number[]): string {
  return parseBestHoursArray(raw).join(', ');
}

function parseBestHoursArray(raw: string | number[]): string[] {
  let hours: number[];
  if (Array.isArray(raw)) { hours = raw; }
  else { try { hours = JSON.parse(raw as string); } catch { return []; } if (!Array.isArray(hours)) return []; }
  if (!hours.length) return [];
  const sorted = [...hours].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0], end = sorted[0];
  const fmt = (h: number) => { const suffix = h >= 12 ? 'PM' : 'AM'; const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h); return `${h12}${suffix}`; };
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) { end = sorted[i]; }
    else { ranges.push(fmt(start) + (start === end ? '' : '-' + fmt(end))); start = sorted[i]; end = sorted[i]; }
  }
  ranges.push(fmt(start) + (start === end ? '' : '-' + fmt(end)));
  return ranges;
}

function parseHoursGrid(hoursStr: string): Array<{day: string; hours: string}> {
  const dayMap: Record<string,string> = {Mo:'Mon',Tu:'Tue',We:'Wed',Th:'Thu',Fr:'Fri',Sa:'Sat',Su:'Sun'};
  const fullDays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const found = new Map<string,string>();

  for (const range of hoursStr.split(';')) {
    const trimmed = range.trim();
    const spaceIdx = trimmed.indexOf(' ');
    if (spaceIdx < 0) { fullDays.forEach(d => found.set(d, trimmed)); }
    else {
      const days = trimmed.slice(0, spaceIdx);
      const times = trimmed.slice(spaceIdx + 1);
      for (const dp of days.split(',').map(d => d.trim())) {
        if (dp.includes('-')) {
          const [s, e] = dp.split('-').map(d => dayMap[d] || d);
          const si = fullDays.indexOf(s), ei = fullDays.indexOf(e);
          if (si >= 0 && ei >= 0) {
            const r = ei >= si ? fullDays.slice(si, ei+1) : [...fullDays.slice(si), ...fullDays.slice(0, ei+1)];
            r.forEach(d => found.set(d, times));
          }
        } else { found.set(dayMap[dp] || dp, times); }
      }
    }
  }

  return fullDays.map(d => ({ day: d, hours: found.get(d) || '' }));
}

export function VenueDetailScreen({ navigation, route }: RootStackScreenProps<'VenueDetail'>) {
  const { t } = useT();
  const { toggle, isFav } = useFavorites();
  const { toggleAlert, isAlertOn } = useAlerts();
  const { isAuthenticated } = useAuth();
  const [venue, setVenue] = useState<Venue | null>(getVenueById(route.params.venueId) ?? null);
  const [rawData, setRawData] = useState<VenueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginModal, setLoginModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchVenueById(route.params.venueId);
        if (data) {
          setRawData(data);
          const amenities: string[] = [];
          if (data.has_wifi) amenities.push('WiFi');
          if ((data.plug_access ?? 0) > 0) amenities.push('Power Outlets');
          if (data.noise_level === 'quiet') amenities.push('Quiet Zone');
          const dist = data.distance_km != null ? (data.distance_km < 1 ? `${Math.round(data.distance_km * 1000)}m` : `${data.distance_km.toFixed(1)} km`) : '—';
          const hours = typeof data.opening_hours_summary === 'string' ? data.opening_hours_summary : (data.opening_hours || 'Varies');
          setVenue({
            id: data.venue_id, name: data.name,
            type: data.cuisine_type || 'Workspace',
            distance: dist, availability: hours,
            rating: data.rating ?? 0,
            price: data.hourly_price ?? data.hourly_fee ?? 5,
            amenities, lat: data.lat, lng: data.lon,
          });
        }
      } catch {}
      setLoading(false);
    })();
  }, [route.params.venueId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (!venue) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>{t('venue.notFound')}</Text>
        <PrimaryButton label={t('venue.goBack')} onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const fav = isFav(venue.id);
  const alertOn = isAlertOn(venue.id);
  const hasWifi = venue.amenities?.includes('WiFi');
  const hasPlugs = venue.amenities?.includes('Power Outlets');
  const hasQuiet = venue.amenities?.includes('Quiet Zone');
  const address = buildAddress(rawData, venue.type + ', Manhattan');

  function openDirections() {
    const destLat = venue?.lat ?? 40.7831;
    const destLng = venue?.lng ?? -73.9712;
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&origin=40.7831,-73.9712&destination=${destLat},${destLng}&travelmode=driving`,
    );
  }

  function handleShare() {
    if (!venue) return;
    Share.share({ message: `${venue.name} — $${venue.price}/hr ★${venue.rating} — Plug & Wifi` });
  }

  function handleReserve() {
    if (!isAuthenticated) { setLoginModal(true); return; }
    if (!venue) return;
    navigation.navigate('Checkout', { venueId: venue.id, venueName: venue.name, duration: '2', price: venue.price * 2 });
  }

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <Image source={{ uri: getVenueImage(venue) }} style={styles.hero} />
          <View style={styles.heroTopBar}>
            <Pressable style={styles.heroCircleBtn} onPress={() => navigation.goBack()}>
              <ChevronLeft size={22} color={colors.white} />
            </Pressable>
            <View style={styles.heroTopRight}>
              <Pressable style={styles.heroCircleBtn} onPress={handleShare}>
                <ShareIcon />
              </Pressable>
              <Pressable style={styles.heroCircleBtn} onPress={() => toggle(venue.id)}>
                <Heart size={20} color={fav ? colors.primary : colors.white} fill={fav ? colors.primary : 'transparent'} />
              </Pressable>
            </View>
          </View>
          {venue.distance !== '—' ? (
            <View style={styles.distanceBadge}>
              <MapPin size={12} color={colors.primary} />
              <Text style={styles.distanceBadgeText}>{venue.distance}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>{venue.name}</Text>
          <View style={styles.typeRow}>
            <Text style={styles.type}>{venue.type}</Text>
            <View style={styles.ratingPill}>
              <Text style={styles.ratingPillText}>★ {venue.rating}</Text>
            </View>
            {rawData?.rating_user_reported != null ? (
              <View style={[styles.ratingPill, { backgroundColor: colors.primaryDark }]}>
                <Text style={styles.ratingPillText}>👤 ★ {rawData.rating_user_reported}</Text>
              </View>
            ) : null}
          </View>
          {rawData?.best_hours_for_work ? (
            <View style={styles.highlightCard}>
              <Star size={16} color="#f59e0b" />
              <View style={{ flex: 1 }}>
                <Text style={styles.highlightTitle}>Best hours for work</Text>
                <View style={styles.timeChipRow}>
                  {parseBestHoursArray(rawData.best_hours_for_work).map((t, i) => (
                    <View key={i} style={styles.timeChipBadge}>
                      <Text style={styles.timeChipBadgeText}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : null}

          <View style={styles.infoRow}>
            <Clock size={15} color={colors.primary} />
            <Text style={styles.infoText}>
              {typeof rawData?.opening_hours === 'string' ? rawData.opening_hours :
               typeof rawData?.opening_hours_summary === 'string' ? rawData.opening_hours_summary :
               venue.availability}
            </Text>
          </View>

           <View style={styles.infoRow}>
            <MapPin size={15} color={colors.textMuted} />
            <Text style={styles.infoText}>{address}</Text>
          </View>

          {(rawData?.phone || rawData?.website) ? (
            <View style={styles.contactRow}>
              {rawData?.phone ? (
                <Pressable style={styles.contactBtn} onPress={() => Linking.openURL(`tel:${rawData.phone}`)}>
                  <Phone size={15} color={colors.primary} />
                  <Text style={styles.contactText}>Call</Text>
                </Pressable>
              ) : null}
              {rawData?.website ? (
                <Pressable style={styles.contactBtn} onPress={() => Linking.openURL(rawData.website!)}>
                  <Globe size={15} color={colors.primary} />
                  <Text style={styles.contactText}>Website</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {(rawData?.nearest_subway || rawData?.nearest_bus) ? (
            <View style={styles.transportCard}>
              {rawData?.nearest_subway ? (
                <View style={styles.transportRow}>
                  <Train size={14} color={colors.textMuted} />
                  <Text style={styles.transportText}>{rawData.nearest_subway}</Text>
                  {rawData.nearest_subway_m != null ? <Text style={styles.transportDist}>{rawData.nearest_subway_m}m</Text> : null}
                </View>
              ) : null}
              {rawData?.nearest_bus ? (
                <View style={styles.transportRow}>
                  <Bus size={14} color={colors.textMuted} />
                  <Text style={styles.transportText}>{rawData.nearest_bus}</Text>
                  {rawData.nearest_bus_m != null ? <Text style={styles.transportDist}>{rawData.nearest_bus_m}m</Text> : null}
                </View>
              ) : null}
            </View>
          ) : null}

          {fav ? (
            <View style={styles.notifyRow}>
              <Bell size={18} color={alertOn ? colors.primary : colors.textMuted} fill={alertOn ? colors.primary : 'transparent'} />
              <Text style={styles.notifyLabel}>{t('venue.getNotified')}</Text>
              <Switch value={alertOn} onValueChange={() => toggleAlert(venue.id)} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.white} />
            </View>
          ) : null}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.amenityCard}>
            <View style={styles.amenityLine}>
              <Wifi size={16} color={hasWifi ? colors.primary : '#d1d5db'} />
              <Text style={[styles.amenityLineText, !hasWifi && styles.amenityLineTextOff]}>
                {hasWifi ? 'WiFi available' : 'WiFi — not yet confirmed'}
              </Text>
            </View>
            <View style={styles.amenityDivider} />
            <View style={styles.amenityLine}>
              <Plug size={16} color={hasPlugs ? colors.primary : '#d1d5db'} />
              <Text style={[styles.amenityLineText, !hasPlugs && styles.amenityLineTextOff]}>
                {hasPlugs ? 'Outlets available' : 'Outlets — not yet confirmed'}
              </Text>
            </View>
            <View style={styles.amenityDivider} />
            <View style={styles.amenityLine}>
              <Star size={16} color={hasQuiet ? colors.primary : '#d1d5db'} />
              <Text style={[styles.amenityLineText, !hasQuiet && styles.amenityLineTextOff]}>
                {hasQuiet ? 'Quiet atmosphere' : 'Noise level — not yet confirmed'}
              </Text>
            </View>
            {(!hasWifi || !hasPlugs || !hasQuiet) ? (
              <Text style={styles.amenityFeedbackHint}>
                Something missing? Your feedback helps us improve accuracy
              </Text>
            ) : null}
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>About this space</Text>
          <Text style={styles.aboutText}>
            {rawData?.cuisine_detail
              ? `${rawData.cuisine_detail.charAt(0).toUpperCase()}${rawData.cuisine_detail.slice(1)}`
              : `A ${venue.type.toLowerCase()} venue`}{' '}
            in {rawData?.borough || 'Manhattan'}
            {rawData?.nearest_subway ? `, a short walk from ${rawData.nearest_subway} station` : ''}.
            {rawData?.best_hours_for_work
              ? ` Best visited ${formatBestHours(rawData.best_hours_for_work)}.`
              : ''}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Ratings & Reviews</Text>
          {rawData?.rating_user_reported != null ? (
            <View style={styles.ratingCard}>
              <Text style={styles.ratingBig}>★ {rawData.rating_user_reported}</Text>
              <Text style={styles.ratingSub}>from app users</Text>
            </View>
          ) : (
            <View style={styles.ratingPlaceholder}>
              <Text style={styles.ratingPlaceholderMain}>No reviews yet</Text>
              <Text style={styles.ratingPlaceholderText}>Be the first to share your experience ^_^</Text>
            </View>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Directions</Text>
          <View style={styles.infoRow}>
            <MapPin size={15} color={colors.textMuted} />
            <Text style={styles.infoText}>{address}</Text>
          </View>
          {(venue.lat != null && venue.lng != null) ? (
            <Pressable onPress={openDirections}>
              <View style={styles.miniMapWrap}>
                <MapView style={styles.miniMap} initialRegion={{ latitude: venue.lat, longitude: venue.lng, latitudeDelta: 0.005, longitudeDelta: 0.005 }} scrollEnabled={false} zoomEnabled={false} pointerEvents="none">
                  <Marker coordinate={{ latitude: venue.lat, longitude: venue.lng }} pinColor="red" />
                </MapView>
              </View>
            </Pressable>
          ) : null}
          <Pressable style={styles.directionsBtn} onPress={openDirections}>
            <Navigation size={18} color={colors.white} />
            <Text style={styles.directionsBtnText}>Get Directions</Text>
          </Pressable>

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomPrice}>
          <Text style={styles.bottomPriceValue}>${venue.price}</Text>
          <Text style={styles.bottomPriceUnit}>/{t('venue.price')}</Text>
        </View>
        <PrimaryButton label={t('venue.reserve')} variant="secondary" onPress={handleReserve} />
      </View>

      <Modal visible={loginModal} transparent animationType="fade">
        <View style={styles.loginModalOverlay}>
          <View style={styles.loginModalCard}>
            <View style={styles.loginModalIcon}><Text style={styles.loginModalEmoji}>🔐</Text></View>
            <Text style={styles.loginModalTitle}>Login Required</Text>
            <Text style={styles.loginModalMessage}>Please sign in or create an account to book this workspace.</Text>
            <PrimaryButton label="Sign In / Register" onPress={() => { setLoginModal(false); navigation.navigate('Login'); }} />
            <Pressable style={styles.loginModalCancel} onPress={() => setLoginModal(false)}>
              <Text style={styles.loginModalCancelText}>Maybe Later</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ShareIcon() {
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 16, height: 16, borderRadius: 3, borderWidth: 2, borderColor: colors.white, position: 'absolute', top: 0, left: 0 }} />
      <View style={{ width: 10, height: 10, borderRadius: 2, borderWidth: 2, borderColor: colors.white, position: 'absolute', bottom: 0, right: 0 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f6f8' },
  scroll: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  notFoundText: { fontSize: 18, color: colors.textMuted, marginBottom: spacing.md },
  heroWrap: { position: 'relative' },
  hero: { width: '100%', height: 270 },
  heroTopBar: { position: 'absolute', top: 48, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTopRight: { flexDirection: 'row', gap: 10 },
  heroCircleBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  distanceBadge: { position: 'absolute', top: 52, right: 16, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  distanceBadgeText: { fontSize: 13, fontWeight: '600', color: colors.text },
  body: { padding: 20 },
  name: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.3, marginBottom: 8 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  type: { fontSize: 15, color: colors.textMuted, textTransform: 'capitalize' },
  ratingPill: { backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  ratingPillText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, paddingVertical: 2 },
  infoText: { fontSize: 14, color: colors.textMuted, flex: 1, lineHeight: 22 },
  infoHighlight: { fontSize: 14, color: '#b45309', fontWeight: '500', flex: 1 },
  highlightCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, backgroundColor: '#fff9ed', borderRadius: 14, marginTop: 10 },
  highlightTitle: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 4 },
  highlightText: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  timeChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  timeChipBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  timeChipBadgeText: { fontSize: 12, color: '#92400e', fontWeight: '500' },
  hoursCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, backgroundColor: '#f0faf5', borderRadius: 14, marginTop: 10 },
  contactRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  contactText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  transportCard: { marginTop: 10, padding: 14, backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.border, gap: 8 },
  transportRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  transportText: { fontSize: 13, color: colors.textMuted, flex: 1 },
  transportDist: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  hoursText: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  notifyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  notifyLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.text },
  divider: { height: 1, backgroundColor: '#eef0f2', marginVertical: 22 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text, letterSpacing: -0.2, marginBottom: 14 },
  aboutText: { fontSize: 14, color: colors.textMuted, lineHeight: 24 },
  amenityCard: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  amenityRow: { gap: 10, marginTop: 8 },
  amenityDivider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 10 },
  amenityLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  amenityLineText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  amenityLineTextOff: { color: colors.textMuted, fontWeight: '400' },
  amenityFeedbackHint: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic', marginTop: 12 },
  ratingCard: { alignItems: 'center', padding: 20, backgroundColor: '#fff9ed', borderRadius: 14, borderWidth: 1, borderColor: '#fde68a' },
  ratingBig: { fontSize: 32, fontWeight: '800', color: '#b45309' },
  ratingSub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  ratingPlaceholder: { alignItems: 'center', padding: 20, backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  ratingPlaceholderMain: { fontSize: 16, fontWeight: '600', color: colors.text },
  ratingPlaceholderText: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  reviewPlaceholder: { alignItems: 'center', paddingVertical: spacing.lg, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  reviewPlaceholderText: { fontSize: 14, color: colors.textMuted, marginTop: spacing.sm },
  miniMapWrap: { borderRadius: 16, overflow: 'hidden', height: 140, marginBottom: 12 },
  miniMap: { width: '100%', height: '100%' },
  directionsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, marginBottom: 8 },
  directionsBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
  bottomSpacer: { height: 110 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 28, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: '#eef0f2', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 8 },
  bottomPrice: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  bottomPriceValue: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  bottomPriceUnit: { fontSize: 14, color: colors.textMuted },
  loginModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  loginModalCard: { width: '85%', backgroundColor: colors.white, borderRadius: 20, padding: spacing.xl, alignItems: 'center', gap: spacing.md },
  loginModalIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  loginModalEmoji: { fontSize: 28 },
  loginModalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  loginModalMessage: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  loginModalCancel: { paddingVertical: spacing.sm },
  loginModalCancelText: { fontSize: 14, color: colors.textMuted },
});

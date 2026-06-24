import { useState, useEffect } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Heart, Bell, MapPin, ChevronLeft, Wifi, Plug, Clock, Navigation, Star } from 'lucide-react-native';
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
          <View style={styles.distanceBadge}>
            <MapPin size={12} color={colors.primary} />
            <Text style={styles.distanceBadgeText}>{venue.distance}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>{venue.name}</Text>
          <View style={styles.typeRow}>
            <Text style={styles.type}>{venue.type}</Text>
            <View style={styles.ratingPill}>
              <Text style={styles.ratingPillText}>★ {venue.rating}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Clock size={15} color={colors.textMuted} />
            <Text style={styles.infoText}>
              {typeof rawData?.opening_hours_summary === 'string' ? rawData.opening_hours_summary : venue.availability}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MapPin size={15} color={colors.textMuted} />
            <Text style={styles.infoText}>{address}</Text>
          </View>

          {fav ? (
            <View style={styles.notifyRow}>
              <Bell size={18} color={alertOn ? colors.primary : colors.textMuted} fill={alertOn ? colors.primary : 'transparent'} />
              <Text style={styles.notifyLabel}>{t('venue.getNotified')}</Text>
              <Switch value={alertOn} onValueChange={() => toggleAlert(venue.id)} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.white} />
            </View>
          ) : null}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.amenityGrid}>
            <View style={[styles.amenityCard, !hasWifi && styles.amenityOff]}>
              <Wifi size={22} color={hasWifi ? colors.primary : colors.border} />
              <Text style={[styles.amenityLabel, !hasWifi && styles.amenityLabelOff]}>WiFi</Text>
              <Text style={styles.amenityStatus}>{hasWifi ? 'Available' : 'N/A'}</Text>
            </View>
            <View style={[styles.amenityCard, !hasPlugs && styles.amenityOff]}>
              <Plug size={22} color={hasPlugs ? colors.primary : colors.border} />
              <Text style={[styles.amenityLabel, !hasPlugs && styles.amenityLabelOff]}>Outlets</Text>
              <Text style={styles.amenityStatus}>{hasPlugs ? 'Available' : 'N/A'}</Text>
            </View>
            <View style={[styles.amenityCard, !hasQuiet && styles.amenityOff]}>
              <Star size={22} color={hasQuiet ? colors.primary : colors.border} />
              <Text style={[styles.amenityLabel, !hasQuiet && styles.amenityLabelOff]}>Quiet</Text>
              <Text style={styles.amenityStatus}>{hasQuiet ? 'Yes' : 'Moderate'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>About this space</Text>
          <Text style={styles.aboutText}>
            {venue.type === 'restaurant' ? 'A restaurant space' : venue.type === 'cafe' ? 'A cafe space' : `A ${venue.type.toLowerCase()} venue`} in {rawData?.borough || 'Manhattan'}
            {rawData?.nearest_subway ? `, near ${rawData.nearest_subway} station` : ''}.
            {hasWifi && hasQuiet ? ' Features reliable WiFi in a quiet atmosphere, ideal for focused work sessions.' :
             hasWifi ? ' Offers WiFi connectivity for your work needs.' :
             hasQuiet ? ' Provides a quiet environment suitable for concentration.' :
             ' Comfortable setting for a productive work session.'}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Reviews</Text>
          <View style={styles.reviewPlaceholder}>
            <Star size={20} color={colors.textMuted} />
            <Text style={styles.reviewPlaceholderText}>Reviews coming soon</Text>
          </View>

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
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  notFoundText: { fontSize: 18, color: colors.textMuted, marginBottom: spacing.md },
  heroWrap: { position: 'relative' },
  hero: { width: '100%', height: 260 },
  heroTopBar: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTopRight: { flexDirection: 'row', gap: spacing.sm },
  heroCircleBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  distanceBadge: { position: 'absolute', top: 56, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.white, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  distanceBadgeText: { fontSize: 13, fontWeight: '600', color: colors.text },
  body: { padding: spacing.lg },
  name: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 4 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  type: { fontSize: 14, color: colors.textMuted },
  ratingPill: { backgroundColor: colors.primary, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  ratingPillText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: spacing.sm },
  infoText: { fontSize: 14, color: colors.textMuted, flex: 1, lineHeight: 20 },
  notifyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, backgroundColor: colors.surface, borderRadius: 10 },
  notifyLabel: { flex: 1, fontSize: 14, color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  aboutText: { fontSize: 14, color: colors.textMuted, lineHeight: 22 },
  amenityGrid: { flexDirection: 'row', gap: spacing.sm },
  amenityCard: { flex: 1, alignItems: 'center', gap: 6, padding: spacing.sm, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  amenityOff: { opacity: 0.4 },
  amenityLabel: { fontSize: 12, fontWeight: '600', color: colors.text },
  amenityLabelOff: { color: colors.textMuted },
  amenityStatus: { fontSize: 11, color: colors.textMuted },
  reviewPlaceholder: { alignItems: 'center', paddingVertical: spacing.lg, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  reviewPlaceholderText: { fontSize: 14, color: colors.textMuted, marginTop: spacing.sm },
  miniMapWrap: { borderRadius: 12, overflow: 'hidden', height: 130, marginBottom: spacing.sm },
  miniMap: { width: '100%', height: '100%' },
  directionsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: spacing.md, marginBottom: spacing.sm },
  directionsBtnText: { fontSize: 15, fontWeight: '600', color: colors.white },
  bottomSpacer: { height: 100 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, paddingBottom: spacing.lg, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border },
  bottomPrice: { flexDirection: 'row', alignItems: 'baseline' },
  bottomPriceValue: { fontSize: 22, fontWeight: '700', color: colors.text },
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

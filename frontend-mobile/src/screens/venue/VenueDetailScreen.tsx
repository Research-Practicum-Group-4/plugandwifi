import { useState, useEffect } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Accessibility, BadgeCheck, Bell, ChevronLeft, Clock, Globe, Heart, MapPin, Navigation, Phone, Plug, Star, Train, Bus, Users, Wifi } from 'lucide-react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { fetchVenueById, fetchVenueReviews, type VenueDetail, type VenueReviewsResponse } from '../../services/venues';
import { getVenueBackupImage, getVenueImage } from '../../utils/venueImages';
import { VenueImage } from '../../components/VenueImage';
import { mapVenue } from '../../utils/mapVenue';
import { useFavorites } from '../../context/FavoriteContext';
import { useAlerts } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
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

type BusyLevel = 'low' | 'medium' | 'high';

function normalizeBusyLevel(label: string | null | undefined): BusyLevel | null {
  if (!label) return null;
  const value = label.toLowerCase();
  if (value.includes('low') || value.includes('quiet')) return 'low';
  if (value.includes('high') || value.includes('busy') || value.includes('crowd')) return 'high';
  return 'medium';
}

function currentHourlyProfile(raw: string | null | undefined, predictedFor?: string | null): { level: BusyLevel; score: number | null } | null {
  if (!raw) return null;
  try {
    // The API returns busyness_predicted_for as a New York local, naïve time.
    // Read its hour directly so the device timezone cannot shift the profile.
    const predictedHour = predictedFor?.match(/T(\d{2}):/u)?.[1];
    const hour = predictedHour ?? new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', hour: '2-digit', hourCycle: 'h23',
    }).format(new Date());
    const profile = JSON.parse(raw) as Record<string, { label?: string; score?: number }>;
    const entry = profile[String(Number(hour))];
    const level = normalizeBusyLevel(entry?.label);
    if (!entry || !level) return null;
    const rawScore = typeof entry.score === 'number' ? entry.score : null;
    const score = rawScore == null ? null : Math.max(0, Math.min(100, rawScore <= 1 ? rawScore * 100 : rawScore));
    return { level, score };
  } catch {
    return null;
  }
}


export function VenueDetailScreen({ navigation, route }: RootStackScreenProps<'VenueDetail'>) {
  const { colors: tc, isDark } = useTheme();
  const { t } = useT();
  const { toggle, isFav } = useFavorites();
  const { toggleAlert, isAlertOn } = useAlerts();
  const { isAuthenticated, token } = useAuth();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [rawData, setRawData] = useState<VenueDetail | null>(null);
  const [reviews, setReviews] = useState<VenueReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginModal, setLoginModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [data, reviewData] = await Promise.all([
          fetchVenueById(route.params.venueId),
          fetchVenueReviews(route.params.venueId).catch(() => null),
        ]);
        if (data) {
          setRawData(data);
          setVenue(mapVenue(data));
          setReviews(reviewData);
        }
      } catch {}
      setLoading(false);
    })();
  }, [route.params.venueId]);

  if (loading) {
    return (
      <View style={[S.centered, { backgroundColor: tc.background }]}>
        <ActivityIndicator size="large" color={tc.primary} />
      </View>
    );
  }
  if (!venue) {
    return (
      <View style={[S.centered, { backgroundColor: tc.background }]}>
        <Text style={[S.notFoundText, { color: tc.textMuted }]}>{t('venue.notFound')}</Text>
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
  const openingHours = typeof rawData?.opening_hours === 'string' ? rawData.opening_hours
    : typeof rawData?.opening_hours_summary === 'string' ? rawData.opening_hours_summary
      : venue.availability;
  const profileBusyness = currentHourlyProfile(rawData?.hourly_profile, rawData?.busyness_predicted_for);
  const busyLevel = normalizeBusyLevel(rawData?.busyness_label) ?? profileBusyness?.level ?? null;
  const busyColor = busyLevel === 'low' ? tc.primary : busyLevel === 'high' ? tc.danger : busyLevel === 'medium' ? '#f59e0b' : tc.textMuted;
  const busyScore = typeof rawData?.busyness_score === 'number'
    ? Math.max(0, Math.min(100, rawData.busyness_score <= 1 ? rawData.busyness_score * 100 : rawData.busyness_score))
    : profileBusyness?.score ?? null;
  const appRating = reviews?.average_rating ?? rawData?.rating_user_reported ?? null;
  const trustTags = rawData ? [
    rawData.wbe_certified ? t('venue.wbeCertified') : null,
    rawData.mbe_certified ? t('venue.mbeCertified') : null,
    rawData.vbe_certified ? t('venue.vbeCertified') : null,
    rawData.bcorp_certified ? t('venue.bcorpCertified') : null,
    rawData.lgbt_friendly ? t('venue.lgbtFriendly') : null,
  ].filter((tag): tag is string => tag != null) : [];

  function openDirections() {
    const destLat = venue?.lat ?? 40.7831;
    const destLng = venue?.lng ?? -73.9712;
    // A directions URL uses the device's real location as its origin. Open the
    // venue pin instead, so browsing NYC venues abroad does not create a route
    // from the user's current country.
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`);
  }

  function handleShare() {
    if (!venue) return;
    Share.share({ message: `${venue.name} — $${venue.price}/hr ★${venue.rating} — Plug & Wifi` });
  }

  function handleReserve() {
    if (!isAuthenticated) { setLoginModal(true); return; }
    if (!venue) return;
    navigation.navigate('Checkout', { venueId: venue.id, venueName: venue.name, price: venue.price });
  }

  return (
    <View style={[S.root, { backgroundColor: tc.background }]}>
      <ScrollView style={S.scroll} showsVerticalScrollIndicator={false}>
        <View style={S.heroWrap}>
          <VenueImage uri={getVenueImage(venue)} fallbackUri={getVenueBackupImage(venue)} style={S.hero} />
          <View style={S.heroTopBar}>
            <Pressable style={S.heroCircleBtn} onPress={() => navigation.goBack()}>
              <ChevronLeft size={22} color="#fff" />
            </Pressable>
            <View style={S.heroTopRight}>
              <Pressable style={S.heroCircleBtn} onPress={handleShare}>
                <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 16, height: 16, borderRadius: 3, borderWidth: 2, borderColor: '#fff', position: 'absolute', top: 0, left: 0 }} />
                  <View style={{ width: 10, height: 10, borderRadius: 2, borderWidth: 2, borderColor: '#fff', position: 'absolute', bottom: 0, right: 0 }} />
                </View>
              </Pressable>
              <Pressable style={S.heroCircleBtn} onPress={() => toggle(venue.id, token ?? undefined)}>
                <Heart size={20} color={fav ? tc.primary : '#fff'} fill={fav ? tc.primary : 'transparent'} />
              </Pressable>
            </View>
          </View>
          {venue.distance !== '—' ? (
            <View style={S.distanceBadge}>
              <MapPin size={12} color={tc.primary} />
              <Text style={[S.distanceBadgeText, { color: '#111827' }]}>{venue.distance}</Text>
            </View>
            ) : null}
          </View>

        <View style={S.body}>
          <Text style={[S.name, { color: tc.text }]}>{venue.name}</Text>
          <View style={S.typeRow}>
            <Text style={[S.type, { color: tc.textMuted }]}>{venue.type}</Text>
            <View style={[S.ratingPill, { backgroundColor: tc.primary }]}>
              <Text style={S.ratingPillText}>★ {venue.rating}</Text>
            </View>
            {appRating != null ? (
              <View style={[S.ratingPill, { backgroundColor: tc.primaryDark }]}>
                <Text style={S.ratingPillText}>👤 ★ {appRating.toFixed(1)}</Text>
              </View>
            ) : null}
          </View>

          <View style={[S.busyCard, { backgroundColor: tc.white, borderColor: tc.border }]}>
            <View style={S.busyHeader}>
              <Users size={15} color={busyColor} />
              <Text style={[S.busyTitle, { color: tc.text }]}>{t('venue.busynessNow')}</Text>
              <View style={[S.busyBadge, { backgroundColor: busyColor + '1F' }]}>
                <Text style={[S.busyBadgeText, { color: busyColor }]}>
                  {busyLevel === 'low' ? t('venue.busyLow')
                    : busyLevel === 'high' ? t('venue.busyHigh')
                      : busyLevel === 'medium' ? t('venue.busyMedium')
                        : t('venue.busyUnavailable')}
                </Text>
              </View>
            </View>
            {busyScore != null ? (
              <View style={[S.busyTrack, { backgroundColor: tc.border }]}>
                <View style={[S.busyFill, { width: `${busyScore}%`, backgroundColor: busyColor }]} />
              </View>
            ) : null}
          </View>

          {(trustTags.length > 0 || rawData?.accessibility_friendly || rawData?.calls_allowed) ? (
            <View style={[S.trustCard, { backgroundColor: tc.white, borderColor: tc.border }]}>
              <Text style={[S.trustTitle, { color: tc.text }]}>{t('venue.trustAccess')}</Text>
              <View style={S.trustTags}>
                {trustTags.map(tag => (
                  <View key={tag} style={[S.trustTag, { backgroundColor: tc.primary + '18' }]}>
                    <BadgeCheck size={14} color={tc.primary} />
                    <Text style={[S.trustTagText, { color: tc.primary }]}>{tag}</Text>
                  </View>
                ))}
                {rawData?.accessibility_friendly ? (
                  <View style={[S.trustTag, { backgroundColor: tc.surface }]}>
                    <Accessibility size={14} color={tc.text} />
                    <Text style={[S.trustTagText, { color: tc.text }]}>{t('venue.accessible')}</Text>
                  </View>
                ) : null}
                {rawData?.calls_allowed ? (
                  <View style={[S.trustTag, { backgroundColor: tc.surface }]}>
                    <Phone size={14} color={tc.text} />
                    <Text style={[S.trustTagText, { color: tc.text }]}>{t('venue.callsAllowed')}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {rawData?.best_hours_for_work ? (
            <View style={[S.highlightCard, { backgroundColor: isDark ? '#78350f2e' : '#fff9ed' }]}>
              <Star size={16} color="#f59e0b" />
              <View style={{ flex: 1 }}>
                <Text style={[S.highlightTitle, { color: tc.text }]}>{t('venue.bestHours')}</Text>
                <View style={S.timeChipRow}>
                  {parseBestHoursArray(rawData.best_hours_for_work).map((chip, i) => (
                    <View key={i} style={[S.timeChipBadge, { backgroundColor: isDark ? '#78350f' : '#fef3c7' }]}>
                      <Text style={[S.timeChipBadgeText, { color: isDark ? '#fde68a' : '#92400e' }]}>{chip}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : null}

          <View style={[S.hoursCard, { backgroundColor: tc.white, borderColor: tc.border }]}>
            <Clock size={18} color={tc.primary} />
            <View style={S.hoursBody}>
              <Text style={[S.hoursTitle, { color: tc.text }]}>{t('venue.openingHours')}</Text>
              <Text style={[S.hoursValue, { color: tc.textMuted }]}>{openingHours}</Text>
            </View>
          </View>

          <View style={S.infoRow}>
            <MapPin size={15} color={tc.textMuted} />
            <Text style={[S.infoText, { color: tc.textMuted }]}>{address}</Text>
          </View>

          {(rawData?.phone || rawData?.website) ? (
            <View style={S.contactRow}>
              {rawData?.phone ? (
                <Pressable style={[S.contactBtn, { backgroundColor: tc.white, borderColor: tc.border }]} onPress={() => Linking.openURL(`tel:${rawData.phone}`)}>
                  <Phone size={15} color={tc.primary} />
                  <Text style={[S.contactText, { color: tc.primary }]}>{t('venue.call')}</Text>
                </Pressable>
              ) : null}
               {rawData?.website ? (
                <Pressable style={[S.contactBtn, { backgroundColor: tc.white, borderColor: tc.border }]} onPress={() => { const w = rawData.website; if (w) Linking.openURL(w); }}>
                  <Globe size={15} color={tc.primary} />
                  <Text style={[S.contactText, { color: tc.primary }]}>{t('venue.website')}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {(rawData?.nearest_subway || rawData?.nearest_bus) ? (
            <View style={[S.transportCard, { backgroundColor: tc.white, borderColor: tc.border }]}>
              {rawData?.nearest_subway ? (
                <View style={S.transportRow}>
                  <Train size={14} color={tc.textMuted} />
                  <Text style={[S.transportText, { color: tc.textMuted }]}>{rawData.nearest_subway}</Text>
                  {rawData.nearest_subway_m != null ? <Text style={[S.transportDist, { color: tc.primary }]}>{rawData.nearest_subway_m}m</Text> : null}
                </View>
              ) : null}
              {rawData?.nearest_bus ? (
                <View style={S.transportRow}>
                  <Bus size={14} color={tc.textMuted} />
                  <Text style={[S.transportText, { color: tc.textMuted }]}>{rawData.nearest_bus}</Text>
                  {rawData.nearest_bus_m != null ? <Text style={[S.transportDist, { color: tc.primary }]}>{rawData.nearest_bus_m}m</Text> : null}
                </View>
              ) : null}
            </View>
          ) : null}

          {fav ? (
            <View style={[S.notifyRow, { backgroundColor: tc.white, borderColor: tc.border }]}>
              <Bell size={18} color={alertOn ? tc.primary : tc.textMuted} fill={alertOn ? tc.primary : 'transparent'} />
              <Text style={[S.notifyLabel, { color: tc.text }]}>{t('venue.getNotified')}</Text>
              <Switch value={alertOn} onValueChange={() => toggleAlert(venue.id)} trackColor={{ false: tc.border, true: tc.primary }} thumbColor={tc.white} />
            </View>
          ) : null}

          <View style={[S.divider, { backgroundColor: tc.border }]} />

          <Text style={[S.sectionTitle, { color: tc.text }]}>{t('venue.amenities')}</Text>
          <View style={[S.amenityCard, { backgroundColor: tc.white, borderColor: tc.border }]}>
            <View style={S.amenityLine}>
              <Wifi size={16} color={hasWifi ? tc.primary : tc.border} />
              <Text style={[S.amenityLineText, { color: hasWifi ? tc.text : tc.textMuted }]}>
                {hasWifi ? t('venue.wifiAvail') : t('venue.wifiUnknown')}
              </Text>
            </View>
            <View style={[S.amenityDivider, { backgroundColor: tc.border }]} />
            <View style={S.amenityLine}>
              <Plug size={16} color={hasPlugs ? tc.primary : tc.border} />
              <Text style={[S.amenityLineText, { color: hasPlugs ? tc.text : tc.textMuted }]}>
                {hasPlugs ? t('venue.outletsAvail') : t('venue.outletsUnknown')}
              </Text>
            </View>
            <View style={[S.amenityDivider, { backgroundColor: tc.border }]} />
            <View style={S.amenityLine}>
              <Star size={16} color={hasQuiet ? tc.primary : tc.border} />
              <Text style={[S.amenityLineText, { color: hasQuiet ? tc.text : tc.textMuted }]}>
                {hasQuiet ? t('venue.quietAvail') : t('venue.quietUnknown')}
              </Text>
            </View>
            {(!hasWifi || !hasPlugs || !hasQuiet) ? (
              <Text style={[S.amenityFeedbackHint, { color: tc.textMuted }]}>
                {t('venue.feedbackHint')}
              </Text>
            ) : null}
          </View>

          <View style={[S.divider, { backgroundColor: tc.border }]} />

          <Text style={[S.sectionTitle, { color: tc.text }]}>{t('venue.about')}</Text>
          <Text style={[S.aboutText, { color: tc.textMuted }]}>
            {rawData?.cuisine_detail
              ? `${rawData.cuisine_detail.charAt(0).toUpperCase()}${rawData.cuisine_detail.slice(1)}`
              : `A ${venue.type.toLowerCase()} venue`}{' '}
            in {rawData?.borough || 'Manhattan'}
            {rawData?.nearest_subway ? `, a short walk from ${rawData.nearest_subway} station` : ''}.
            {rawData?.best_hours_for_work
              ? ` Best visited ${formatBestHours(rawData.best_hours_for_work)}.`
              : ''}
          </Text>

          <View style={[S.divider, { backgroundColor: tc.border }]} />

          <Text style={[S.sectionTitle, { color: tc.text }]}>{t('venue.ratingsReviews')}</Text>
          {appRating != null ? (
            <>
              <View style={[S.ratingCard, { backgroundColor: isDark ? '#78350f2e' : '#fff9ed', borderColor: isDark ? '#b4530966' : '#fde68a' }]}>
                <Text style={[S.ratingBig, { color: isDark ? '#fbbf24' : '#b45309' }]}>★ {appRating.toFixed(1)}</Text>
                <Text style={[S.ratingSub, { color: tc.textMuted }]}>{t('venue.fromAppUsers')} · {reviews?.total_items ?? 0}</Text>
              </View>
              {reviews?.items.filter(review => review.comment?.trim() || review.wifi_score != null || review.plug_score != null || review.quietness_score != null).map(review => (
                <View key={review.id} style={[S.reviewCard, { backgroundColor: tc.white, borderColor: tc.border }]}>
                  <View style={S.reviewHeader}>
                    <Text style={[S.reviewName, { color: tc.text }]}>{review.reviewer_name || t('venue.appUser')}</Text>
                    <Text style={[S.reviewScore, { color: tc.star }]}>★ {review.rating?.toFixed(1) ?? '—'}</Text>
                  </View>
                  <View style={[S.reviewBreakdown, { backgroundColor: tc.surface }]}>
                    <Text style={[S.reviewBreakdownItem, { color: tc.textMuted }]}>📶 {t('common.wifi')} · ★ {review.wifi_score?.toFixed(1) ?? '—'}</Text>
                    <Text style={[S.reviewBreakdownItem, { color: tc.textMuted }]}>🔌 {t('common.plugs')} · ★ {review.plug_score?.toFixed(1) ?? '—'}</Text>
                    <Text style={[S.reviewBreakdownItem, { color: tc.textMuted }]}>🤫 {t('common.quiet')} · ★ {review.quietness_score?.toFixed(1) ?? '—'}</Text>
                  </View>
                  {review.comment?.trim() ? <Text style={[S.reviewComment, { color: tc.textMuted }]}>{review.comment}</Text> : null}
                </View>
              ))}
            </>
          ) : (
            <View style={[S.ratingPlaceholder, { backgroundColor: tc.white, borderColor: tc.border }]}>
              <Text style={[S.ratingPlaceholderMain, { color: tc.text }]}>{t('venue.noReviews')}</Text>
              <Text style={[S.ratingPlaceholderText, { color: tc.textMuted }]}>{t('venue.beFirst')}</Text>
            </View>
          )}

          <View style={[S.divider, { backgroundColor: tc.border }]} />

          <Text style={[S.sectionTitle, { color: tc.text }]}>{t('venue.directions')}</Text>
          <View style={S.infoRow}>
            <MapPin size={15} color={tc.textMuted} />
            <Text style={[S.infoText, { color: tc.textMuted }]}>{address}</Text>
          </View>
          {(venue.lat != null && venue.lng != null) ? (
            <Pressable onPress={openDirections}>
              <View style={S.miniMapWrap}>
                <MapView style={S.miniMap} initialRegion={{ latitude: venue.lat, longitude: venue.lng, latitudeDelta: 0.005, longitudeDelta: 0.005 }} scrollEnabled={false} zoomEnabled={false} pointerEvents="none">
                  <Marker coordinate={{ latitude: venue.lat, longitude: venue.lng }} pinColor="red" />
                </MapView>
              </View>
            </Pressable>
          ) : null}
          <Pressable style={[S.directionsBtn, { backgroundColor: tc.primary }]} onPress={openDirections}>
            <Navigation size={18} color="#fff" />
            <Text style={S.directionsBtnText}>{t('venue.getDirections')}</Text>
          </Pressable>

          <View style={S.bottomSpacer} />
        </View>
      </ScrollView>

      <View style={[S.bottomBar, { backgroundColor: tc.white, borderTopColor: tc.border }]}>
        <View style={S.bottomPrice}>
          <Text style={[S.bottomPriceValue, { color: tc.text }]}>${venue.price}</Text>
          <Text style={[S.bottomPriceUnit, { color: tc.textMuted }]}>/{t('venue.price')}</Text>
        </View>
        <PrimaryButton label={t('venue.reserve')} variant="secondary" onPress={handleReserve} />
      </View>

      <Modal visible={loginModal} transparent animationType="fade">
        <View style={S.loginModalOverlay}>
          <View style={[S.loginModalCard, { backgroundColor: tc.white }]}>
            <View style={[S.loginModalIcon, { backgroundColor: tc.surface }]}><Text style={S.loginModalEmoji}>🔐</Text></View>
            <Text style={[S.loginModalTitle, { color: tc.text }]}>{t('venue.loginRequired')}</Text>
            <Text style={[S.loginModalMessage, { color: tc.textMuted }]}>{t('venue.loginMsg')}</Text>
            <PrimaryButton label={t('venue.signInRegister')} onPress={() => { setLoginModal(false); navigation.navigate('Login'); }} />
            <Pressable style={S.loginModalCancel} onPress={() => setLoginModal(false)}>
              <Text style={[S.loginModalCancelText, { color: tc.textMuted }]}>{t('venue.maybeLater')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  notFoundText: { fontSize: 18, marginBottom: spacing.md },
  heroWrap: { position: 'relative' },
  hero: { width: '100%', height: 270 },
  heroTopBar: { position: 'absolute', top: 48, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTopRight: { flexDirection: 'row', gap: 10 },
  heroCircleBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  distanceBadge: { position: 'absolute', top: 52, right: 16, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  distanceBadgeText: { fontSize: 13, fontWeight: '600' },
  body: { padding: 20 },
  name: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3, marginBottom: 8 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  type: { fontSize: 15, textTransform: 'capitalize' },
  ratingPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  ratingPillText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, paddingVertical: 2 },
  infoText: { fontSize: 14, flex: 1, lineHeight: 22 },
  hoursCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderWidth: 1, borderRadius: 12, padding: spacing.md, marginTop: 10 },
  hoursBody: { flex: 1, gap: 3 },
  hoursTitle: { fontSize: 14, fontWeight: '700' },
  hoursValue: { fontSize: 13, lineHeight: 20 },
  highlightCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 14, marginTop: 10 },
  highlightTitle: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  timeChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  timeChipBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  timeChipBadgeText: { fontSize: 12, fontWeight: '500' },
  contactRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  contactText: { fontSize: 14, fontWeight: '600' },
  transportCard: { marginTop: 10, padding: 14, borderRadius: 14, borderWidth: 1, gap: 8 },
  transportRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  transportText: { fontSize: 13, flex: 1 },
  transportDist: { fontSize: 13, fontWeight: '600' },
  notifyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1 },
  busyCard: { marginTop: 10, padding: 14, borderRadius: 14, borderWidth: 1, gap: 10 },
  busyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  busyTitle: { fontSize: 13, fontWeight: '600', flex: 1 },
  busyBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  busyBadgeText: { fontSize: 12, fontWeight: '700' },
  busyTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  busyFill: { height: '100%', borderRadius: 3 },
  trustCard: { marginTop: 10, padding: 14, borderRadius: 14, borderWidth: 1, gap: 10 },
  trustTitle: { fontSize: 13, fontWeight: '700' },
  trustTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trustTag: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  trustTagText: { fontSize: 12, fontWeight: '600' },
  notifyLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  divider: { height: 1, marginVertical: 22 },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, marginBottom: 14 },
  aboutText: { fontSize: 14, lineHeight: 24 },
  amenityCard: { borderRadius: 14, borderWidth: 1, padding: spacing.md },
  amenityDivider: { height: 1, marginVertical: 10 },
  amenityLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  amenityLineText: { fontSize: 14, fontWeight: '500' },
  amenityFeedbackHint: { fontSize: 12, fontStyle: 'italic', marginTop: 12 },
  ratingCard: { alignItems: 'center', padding: 20, borderRadius: 14, borderWidth: 1 },
  ratingBig: { fontSize: 32, fontWeight: '800' },
  ratingSub: { fontSize: 13, marginTop: 4 },
  reviewCard: { borderWidth: 1, borderRadius: 12, padding: spacing.md, gap: 8, marginTop: spacing.sm },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewName: { fontSize: 13, fontWeight: '700' },
  reviewScore: { fontSize: 13, fontWeight: '700' },
  reviewBreakdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  reviewBreakdownItem: { fontSize: 12, fontWeight: '600' },
  reviewComment: { fontSize: 14, lineHeight: 21 },
  ratingPlaceholder: { alignItems: 'center', padding: 20, borderRadius: 14, borderWidth: 1 },
  ratingPlaceholderMain: { fontSize: 16, fontWeight: '600' },
  ratingPlaceholderText: { fontSize: 13, marginTop: 6 },
  miniMapWrap: { borderRadius: 16, overflow: 'hidden', height: 140, marginBottom: 12 },
  miniMap: { width: '100%', height: '100%' },
  directionsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14, marginBottom: 8 },
  directionsBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  bottomSpacer: { height: 110 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 28, borderTopWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 8 },
  bottomPrice: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  bottomPriceValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  bottomPriceUnit: { fontSize: 14 },
  loginModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  loginModalCard: { width: '85%', borderRadius: 20, padding: spacing.xl, alignItems: 'center', gap: spacing.md },
  loginModalIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  loginModalEmoji: { fontSize: 28 },
  loginModalTitle: { fontSize: 20, fontWeight: '700' },
  loginModalMessage: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  loginModalCancel: { paddingVertical: spacing.sm },
  loginModalCancelText: { fontSize: 14 },
});

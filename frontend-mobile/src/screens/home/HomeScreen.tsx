import { useCallback, useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator, Modal, Pressable, RefreshControl,
  PermissionsAndroid, Platform, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { MapPin, X, Search, Navigation } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogoImage } from '../../components/LogoImage';
import { PrimaryButton } from '../../components/PrimaryButton';
import { VenueCard } from '../../components/VenueCard';
import { fetchVenues } from '../../services/venues';
import { mapVenue } from '../../utils/mapVenue';
import type { Venue } from '../../types/venue';
import { useT } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../theme/spacing';
import type { MainTabScreenProps } from '../../types/navigation';

const DEFAULT_REGION: Region = {
  latitude: 40.7831, longitude: -73.9712,
  latitudeDelta: 0.08, longitudeDelta: 0.08,
};
const DEFAULT_LOC_NAME = 'Midtown Manhattan';
const MANHATTAN_BBOX = 'viewbox=-74.02,40.70,-73.91,40.88&bounded=1';

export function HomeScreen({ navigation }: MainTabScreenProps<'Home'>) {
  const { t } = useT();
  const { colors: tc } = useTheme();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [filters, setFilters] = useState({ noLoudMusic: false, threeStars: false, fourStars: false });
  const allActive = !filters.noLoudMusic && !filters.threeStars && !filters.fourStars;
  const [locName, setLocName] = useState(DEFAULT_LOC_NAME);
  const [userLoc, setUserLoc] = useState({ lat: DEFAULT_REGION.latitude, lng: DEFAULT_REGION.longitude });
  const [locModal, setLocModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ lat: string; lon: string; display: string }>>([]);
  const mapRef = useRef<MapView>(null);
  const [selectedMarker, setSelectedMarker] = useState<{ latitude: number; longitude: number } | null>(null);
  // Location picked in the modal but not yet confirmed; applied only on Confirm
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [canUseDeviceLocation, setCanUseDeviceLocation] = useState(Platform.OS === 'ios');
  const appliedDeviceLocation = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: t('home.locationPermissionTitle'),
        message: t('home.locationPermissionMessage'),
        buttonPositive: t('common.ok'),
        buttonNegative: t('common.cancel'),
      },
    ).then(result => {
      setCanUseDeviceLocation(result === PermissionsAndroid.RESULTS.GRANTED);
    });
  }, [t]);

  function applyDeviceLocation(latitude: number, longitude: number) {
    if (appliedDeviceLocation.current || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    appliedDeviceLocation.current = true;
    setUserLoc({ lat: latitude, lng: longitude });
    setLocName(t('home.deviceLocation'));
  }

  const loadVenues = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const params: any = { lat: userLoc.lat, lon: userLoc.lng, radius: 5 };
      if (filters.noLoudMusic) params.noise_level = 'quiet';
      const r = await fetchVenues(params);
      // Production inventory is currently concentrated in New York. If the
      // device location is outside the covered area, return to the default
      // discovery location instead of replacing the list with an empty state.
      const isDefaultLocation = userLoc.lat === DEFAULT_REGION.latitude && userLoc.lng === DEFAULT_REGION.longitude;
      if (r.items.length === 0 && !isDefaultLocation) {
        setUserLoc({ lat: DEFAULT_REGION.latitude, lng: DEFAULT_REGION.longitude });
        setLocName(DEFAULT_LOC_NAME);
        return;
      }
      setVenues(r.items.map(mapVenue));
    } catch {
      setVenues([]);
      setLoadError(true);
    }
    setLoading(false);
  }, [filters.noLoudMusic, userLoc.lat, userLoc.lng]);

  useEffect(() => { void loadVenues(); }, [loadVenues]);

  async function refreshVenues() {
    setRefreshing(true);
    await loadVenues();
    setRefreshing(false);
  }

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (searchTimer.current) clearTimeout(searchTimer.current); }, []);

  function toggleFilter(key: keyof typeof filters) {
    setFilters(f => {
      if (key === 'threeStars') return { ...f, threeStars: !f.threeStars, fourStars: false };
      if (key === 'fourStars') return { ...f, fourStars: !f.fourStars, threeStars: false };
      return { ...f, [key]: !f[key] };
    });
  }

  function doSearch(text: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      const q = text.trim();
      if (!q) { setSearchResults([]); return; }
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&${MANHATTAN_BBOX}`,
          { headers: { 'User-Agent': 'PlugWifiApp/1.0' } },
        );
        const data = await res.json();
        const results = (data as any[]).map((d: any) => ({
          lat: d.lat, lon: d.lon, display: d.display_name || d.name || q,
        }));
        setSearchResults(results);
      } catch { setSearchResults([]); }
      setSearching(false);
    }, 300);
  }

  function selectResult(item: { lat: string; lon: string; display: string }) {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    mapRef.current?.animateToRegion({ latitude: lat, longitude: lon, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 500);
    setSearchResults([]);
    setSelectedMarker({ latitude: lat, longitude: lon });
    const shortName = item.display.split(',')[0].trim();
    setSearchQuery(shortName);
    setPendingName(shortName);
  }

  function confirmLocation() {
    if (selectedMarker && pendingName) {
      setUserLoc({ lat: selectedMarker.latitude, lng: selectedMarker.longitude });
      setLocName(pendingName);
    }
    setLocModal(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedMarker(null);
    setPendingName(null);
  }

  const filteredVenues = venues.filter(v => {
    if (filters.fourStars && v.rating < 4) return false;
    if (filters.threeStars && v.rating < 3) return false;
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: tc.background }]}>
      {canUseDeviceLocation && !appliedDeviceLocation.current ? (
        <MapView
          pointerEvents="none"
          style={styles.locationProbe}
          initialRegion={DEFAULT_REGION}
          showsUserLocation
          showsMyLocationButton={false}
          onUserLocationChange={event => {
            const coordinate = event.nativeEvent.coordinate;
            if (coordinate) applyDeviceLocation(coordinate.latitude, coordinate.longitude);
          }}
        />
      ) : null}
      <SafeAreaView edges={['top']} style={[styles.header, { backgroundColor: tc.white, borderBottomColor: tc.border }]}>
        <View style={styles.topRow}>
          <LogoImage />
          <Pressable style={[styles.locBtn, { backgroundColor: tc.surface }]} onPress={() => { setSelectedMarker({ latitude: userLoc.lat, longitude: userLoc.lng }); setLocModal(true); }}>
            <MapPin size={14} color={tc.primary} />
            <Text style={[styles.locLabel, { color: tc.textMuted }]}>{t('home.location')}</Text>
            <Text style={[styles.locText, { color: tc.text }]} numberOfLines={1}>{locName}</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
          <Pressable
            style={[styles.filterPill, { borderColor: tc.border }, allActive && { borderColor: tc.primary, backgroundColor: tc.primary }]}
            onPress={() => setFilters({ noLoudMusic: false, threeStars: false, fourStars: false })}
          >
            <Text style={[styles.filterText, { color: tc.textMuted }, allActive && { color: tc.white, fontWeight: '600' }]}>{t('home.all')}</Text>
          </Pressable>
          {(['threeStars', 'fourStars', 'noLoudMusic'] as const).map(key => (
            <Pressable
              key={key}
              style={[styles.filterPill, { borderColor: tc.border }, filters[key] && { borderColor: tc.primary, backgroundColor: tc.primary }]}
              onPress={() => toggleFilter(key)}
            >
              <Text style={[styles.filterText, { color: tc.textMuted }, filters[key] && { color: tc.white, fontWeight: '600' }]}>
                {key === 'threeStars' ? t('home.threeStars') : key === 'fourStars' ? t('home.fourStars') : t('home.noLoudMusic')}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshVenues} colors={[tc.primary]} />
        }
      >
        {loading && venues.length === 0 ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={tc.primary} />
            <Text style={[styles.loadingText, { color: tc.textMuted }]}>{t('home.finding')}</Text>
          </View>
        ) : filteredVenues.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, { color: tc.text }]}>{loadError ? t('home.loadErrorTitle') : t('home.noVenuesTitle')}</Text>
            <Text style={[styles.emptyDesc, { color: tc.textMuted }]}>{loadError ? t('home.loadErrorDesc') : t('home.noVenuesDesc')}</Text>
            <PrimaryButton label={t('home.refresh')} onPress={loadVenues} />
          </View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: tc.text }]}>{t('home.workspacesNear')} {locName}</Text>
            {filteredVenues.map(v => (
              <VenueCard key={v.id} venue={v} onPress={() => navigation.navigate('VenueDetail', { venueId: v.id })} />
            ))}
          </>
        )}
      </ScrollView>

      <Modal visible={locModal} animationType="slide">
        <View style={[styles.locModal, { backgroundColor: tc.background }]}>
          <SafeAreaView edges={['top']}>
            <View style={styles.locModalHeader}>
              <Pressable onPress={() => { setLocModal(false); setSearchQuery(''); setSearchResults([]); setSelectedMarker(null); setPendingName(null); }} hitSlop={12}>
                <X size={22} color={tc.text} />
              </Pressable>
              <Text style={[styles.locModalTitle, { color: tc.text }]}>{t('home.chooseLocation')}</Text>
              <View style={{ width: 22 }} />
            </View>
            <View style={styles.searchRow}>
              <View style={[styles.searchInputRow, { borderColor: tc.border, backgroundColor: tc.white }]}>
                <Search size={16} color={tc.textMuted} style={{ marginLeft: spacing.sm }} />
                <TextInput
                  style={[styles.searchInput, { color: tc.text }]}
                  placeholder={t('home.searchPlaceholder')}
                  placeholderTextColor={tc.textMuted}
                  value={searchQuery}
                  onChangeText={text => { setSearchQuery(text); doSearch(text); }}
                  onSubmitEditing={() => doSearch(searchQuery)}
                  returnKeyType="search"
                />
              </View>
              <Pressable style={[styles.searchBtn, { backgroundColor: tc.primary }]} onPress={() => doSearch(searchQuery)}>
                {searching ? (
                  <ActivityIndicator size="small" color={tc.white} />
                ) : (
                  <Text style={styles.searchBtnText}>{t('home.go')}</Text>
                )}
              </Pressable>
            </View>
          </SafeAreaView>
          {searchResults.length > 0 ? (
            <ScrollView style={[styles.resultList, { backgroundColor: tc.background }]} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              {searchResults.map((item, i) => (
                <Pressable key={i} style={[styles.resultItem, { borderColor: tc.border, backgroundColor: tc.white }]} onPress={() => selectResult(item)}>
                  <View style={[styles.resultIcon, { backgroundColor: tc.primary + '20' }]}>
                    <MapPin size={16} color={tc.primary} />
                  </View>
                  <View style={styles.resultInfo}>
                    <Text style={[styles.resultName, { color: tc.text }]} numberOfLines={1}>{item.display.split(',')[0].trim()}</Text>
                    <Text style={[styles.resultDetail, { color: tc.textMuted }]} numberOfLines={1}>{item.display.split(',').slice(1).join(',').trim()}</Text>
                  </View>
                  <Navigation size={14} color={tc.textMuted} />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          <MapView
            ref={mapRef}
            style={styles.locMap}
            initialRegion={DEFAULT_REGION}
            showsUserLocation={canUseDeviceLocation}
            showsMyLocationButton={canUseDeviceLocation}
            onUserLocationChange={event => {
              const coordinate = event.nativeEvent.coordinate;
              if (coordinate) applyDeviceLocation(coordinate.latitude, coordinate.longitude);
            }}
            scrollEnabled zoomEnabled
            onPress={e => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              setSelectedMarker({ latitude, longitude });
              setPendingName(t('home.selectedLocation'));
            }}
          >
            {selectedMarker ? (<Marker coordinate={selectedMarker} pinColor="#007AFF" title={pendingName ?? locName} />) : null}
            {searchResults.map((item, i) => (
              <Marker
                key={`r-${i}`}
                coordinate={{ latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) }}
                pinColor="red"
                title={item.display.split(',')[0]}
                onPress={() => selectResult(item)}
              />
            ))}
          </MapView>
          <View style={[styles.locModalFooter, { backgroundColor: tc.white, borderTopColor: tc.border }]}>
            <View style={styles.locModalFooterInfo}>
              <MapPin size={14} color={tc.primary} />
              <Text style={[styles.locModalFooterText, { color: tc.textMuted }]} numberOfLines={1}>{pendingName ?? locName}</Text>
            </View>
            <PrimaryButton label={t('home.confirmLocation')} onPress={confirmLocation} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  locationProbe: { position: 'absolute', width: 1, height: 1, opacity: 0.01 },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm, borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  locBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
  },
  locLabel: { fontSize: 11 },
  locText: { fontSize: 12, fontWeight: '500', maxWidth: 80 },
  filterScroll: { marginTop: spacing.xs },
  filterContent: { gap: spacing.sm, paddingBottom: spacing.xs },
  filterPill: {
    borderWidth: 1, borderRadius: 999,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  filterText: { fontSize: 13 },
  list: { flex: 1 },
  listContent: { padding: spacing.md, paddingBottom: spacing.xl },
  loadingWrap: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  loadingText: { fontSize: 15 },
  emptyWrap: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyDesc: { textAlign: 'center', fontSize: 13 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  locModal: { flex: 1 },
  locModalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  locModalTitle: { fontSize: 18, fontWeight: '600' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  searchInputRow: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12, gap: spacing.xs,
  },
  searchInput: { flex: 1, paddingVertical: 12, paddingRight: spacing.md, fontSize: 15 },
  searchBtn: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  locMap: { flex: 1 },
  resultList: { maxHeight: 220 },
  resultItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    marginHorizontal: spacing.md, marginBottom: spacing.xs,
    padding: spacing.md, borderRadius: 12, borderWidth: 1,
  },
  resultIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: '600' },
  resultDetail: { fontSize: 12, marginTop: 2 },
  locModalFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, paddingBottom: spacing.xl,
    borderTopWidth: 1, gap: spacing.md,
  },
  locModalFooterInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  locModalFooterText: { fontSize: 13, flex: 1 },
});

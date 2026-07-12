import { useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator, Modal, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { MapPin, X, Search, Navigation } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogoImage } from '../../components/LogoImage';
import { PrimaryButton } from '../../components/PrimaryButton';
import { VenueCard } from '../../components/VenueCard';
import { fetchVenues, type VenueItem } from '../../services/venues';
import { mapVenue } from '../../utils/mapVenue';
import type { Venue } from '../../types/venue';
import { mockVenues } from '../../data/mockVenues';
import { useT } from '../../context/LanguageContext';
import { colors } from '../../theme/colors';
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
  const [venues, setVenues] = useState<Venue[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ noLoudMusic: false, threeStars: false, fourStars: false });
  const allActive = !filters.noLoudMusic && !filters.threeStars && !filters.fourStars;
  const [locName, setLocName] = useState(DEFAULT_LOC_NAME);
  const [userLoc, setUserLoc] = useState({ lat: DEFAULT_REGION.latitude, lng: DEFAULT_REGION.longitude });
  const [locModal, setLocModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ lat: string; lon: string; display: string }>>([]);
  const mapRef = useRef<MapView>(null);
  const [selectedMarker, setSelectedMarker] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => { loadVenues(); }, [filters.noLoudMusic, filters.fourStars, userLoc]);

  async function loadVenues() {
    setLoading(true);
    try {
      const params: any = { lat: userLoc.lat, lon: userLoc.lng, radius: 5 };
      if (filters.noLoudMusic) params.noise_level = 'quiet';
      const r = await fetchVenues(params);
      setVenues(r.items.map(mapVenue));
      if (!initialized) setInitialized(true);
    } catch {
      if (!initialized) { setVenues(mockVenues); setInitialized(true); }
    }
    setLoading(false);
  }

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function toggleFilter(key: keyof typeof filters) {
    setFilters(f => ({ ...f, [key]: !f[key] }));
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
    setLocName(shortName);
    setUserLoc({ lat, lng: lon });
  }

  function confirmLocation() {
    if (selectedMarker) {
      setUserLoc({ lat: selectedMarker.latitude, lng: selectedMarker.longitude });
    }
    setLocModal(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedMarker(null);
  }

  const filteredVenues = venues.filter(v => {
    if (filters.fourStars && v.rating < 4) return false;
    if (filters.threeStars && v.rating < 3) return false;
    return true;
  });

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.topRow}>
          <LogoImage />
          <Pressable style={styles.locBtn} onPress={() => { setSelectedMarker({ latitude: userLoc.lat, longitude: userLoc.lng }); setLocModal(true); }}>
            <MapPin size={14} color={colors.primary} />
            <Text style={styles.locLabel}>Location</Text>
            <Text style={styles.locText} numberOfLines={1}>{locName}</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
          <Pressable
            style={[styles.filterPill, allActive && styles.filterPillActive]}
            onPress={() => setFilters({ noLoudMusic: false, threeStars: false, fourStars: false })}
          >
            <Text style={[styles.filterText, allActive && styles.filterTextActive]}>All</Text>
          </Pressable>
          {(['threeStars', 'fourStars', 'noLoudMusic'] as const).map(key => (
            <Pressable
              key={key}
              style={[styles.filterPill, filters[key] && styles.filterPillActive]}
              onPress={() => toggleFilter(key)}
            >
              <Text style={[styles.filterText, filters[key] && styles.filterTextActive]}>
                {key === 'threeStars' ? '3+ Stars' : key === 'fourStars' ? '4+ Stars' : t('home.noLoudMusic')}
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
          <RefreshControl refreshing={loading} onRefresh={loadVenues} colors={[colors.primary]} />
        }
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{t('home.finding')}</Text>
          </View>
        ) : filteredVenues.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>{t('home.noVenuesTitle')}</Text>
            <Text style={styles.emptyDesc}>{t('home.noVenuesDesc')}</Text>
            <PrimaryButton label={t('home.refresh')} onPress={loadVenues} />
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Workspaces near {locName}</Text>
            {filteredVenues.map(v => (
              <VenueCard key={v.id} venue={v} onPress={() => navigation.navigate('VenueDetail', { venueId: v.id })} />
            ))}
          </>
        )}
      </ScrollView>

      <Modal visible={locModal} animationType="slide">
        <View style={styles.locModal}>
          <SafeAreaView edges={['top']}>
            <View style={styles.locModalHeader}>
              <Pressable onPress={() => { setLocModal(false); setSearchQuery(''); setSearchResults([]); setSelectedMarker(null); }} hitSlop={12}>
                <X size={22} color={colors.text} />
              </Pressable>
              <Text style={styles.locModalTitle}>Choose Location</Text>
              <View style={{ width: 22 }} />
            </View>
            <View style={styles.searchRow}>
              <View style={styles.searchInputRow}>
                <Search size={16} color={colors.textMuted} style={{ marginLeft: spacing.sm }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search city or area..."
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={text => { setSearchQuery(text); doSearch(text); }}
                  onSubmitEditing={() => doSearch(searchQuery)}
                  returnKeyType="search"
                />
              </View>
              <Pressable style={styles.searchBtn} onPress={() => doSearch(searchQuery)}>
                {searching ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.searchBtnText}>Go</Text>
                )}
              </Pressable>
            </View>
          </SafeAreaView>
          {searchResults.length > 0 ? (
            <ScrollView style={styles.resultList} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              {searchResults.map((item, i) => (
                <Pressable key={i} style={styles.resultItem} onPress={() => selectResult(item)}>
                  <View style={styles.resultIcon}>
                    <MapPin size={16} color={colors.primary} />
                  </View>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName} numberOfLines={1}>{item.display.split(',')[0].trim()}</Text>
                    <Text style={styles.resultDetail} numberOfLines={1}>{item.display.split(',').slice(1).join(',').trim()}</Text>
                  </View>
                  <Navigation size={14} color={colors.textMuted} />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          <MapView
            ref={mapRef}
            style={styles.locMap}
            initialRegion={DEFAULT_REGION}
            scrollEnabled zoomEnabled
            onPress={e => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              setSelectedMarker({ latitude, longitude });
              setLocName('Selected Location');
            }}
          >
            {selectedMarker ? (<Marker coordinate={selectedMarker} pinColor="#007AFF" title={locName} />) : null}
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
          <View style={styles.locModalFooter}>
            <View style={styles.locModalFooterInfo}>
              <MapPin size={14} color={colors.primary} />
              <Text style={styles.locModalFooterText} numberOfLines={1}>{locName}</Text>
            </View>
            <PrimaryButton label="Confirm" onPress={confirmLocation} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.white, paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  locBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
  },
  locLabel: { fontSize: 11, color: colors.textMuted },
  locText: { fontSize: 12, color: colors.text, fontWeight: '500', maxWidth: 80 },
  filterScroll: { marginTop: spacing.xs },
  filterContent: { gap: spacing.sm, paddingBottom: spacing.xs },
  filterPill: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 999,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  filterPillActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  filterText: { color: colors.textMuted, fontSize: 13 },
  filterTextActive: { color: colors.white, fontWeight: '600' },
  list: { flex: 1 },
  listContent: { padding: spacing.md, paddingBottom: spacing.xl },
  loadingWrap: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  loadingText: { color: colors.textMuted, fontSize: 15 },
  emptyWrap: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  emptyDesc: { color: colors.textMuted, textAlign: 'center', fontSize: 13 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  locModal: { flex: 1, backgroundColor: colors.background },
  locModalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  locModalTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  searchInputRow: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    backgroundColor: colors.white, gap: spacing.xs,
  },
  searchInput: { flex: 1, paddingVertical: 12, paddingRight: spacing.md, fontSize: 15, color: colors.text },
  searchBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  locMap: { flex: 1 },
  resultList: { backgroundColor: colors.background, maxHeight: 220 },
  resultItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    marginHorizontal: spacing.md, marginBottom: spacing.xs,
    padding: spacing.md, backgroundColor: colors.white,
    borderRadius: 12, borderWidth: 1, borderColor: colors.border,
  },
  resultIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e8f5ef', alignItems: 'center', justifyContent: 'center' },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: '600', color: colors.text },
  resultDetail: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  locModalFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, paddingBottom: spacing.xl,
    backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.md,
  },
  locModalFooterInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  locModalFooterText: { fontSize: 13, color: colors.textMuted, flex: 1 },
});

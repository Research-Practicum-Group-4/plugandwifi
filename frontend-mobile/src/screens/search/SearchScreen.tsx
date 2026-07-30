import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FilterChip } from '../../components/FilterChip';
import { VenueCard } from '../../components/VenueCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { fetchVenues, type VenueFilterParams } from '../../services/venues';
import { mapVenue } from '../../utils/mapVenue';
import { clusterVenues } from '../../utils/mapClusters';
import { useTheme } from '../../context/ThemeContext';
import { useT } from '../../context/LanguageContext';
import { spacing } from '../../theme/spacing';
import type { MainTabScreenProps } from '../../types/navigation';
import type { Venue } from '../../types/venue';

type SearchViewMode = 'list' | 'map';
const DEFAULT_REGION: Region = { latitude: 40.7831, longitude: -73.9712, latitudeDelta: 0.05, longitudeDelta: 0.05 };
const PAGE_SIZE = 100;

function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return true;
  if (t.includes(q)) return true;
  return q.split(/\s+/).every(w => t.includes(w));
}

export function SearchScreen({ navigation }: MainTabScreenProps<'Search'>) {
  const { colors: tc } = useTheme();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [nextPage, setNextPage] = useState(2);
  const [hasMore, setHasMore] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState('');
  const { t } = useT();
  const [viewMode, setViewMode] = useState<SearchViewMode>('list');
  const [filters, setFilters] = useState({ noLoudMusic: false, fourPlusStars: false });
  const [priceRange, setPriceRange] = useState<[number, number]>([1, 10]);
  const [minPrice, maxPrice] = priceRange;
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const mapRef = useRef<MapView>(null);
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const requestGeneration = useRef(0);
  const loadingMoreRef = useRef(false);

  const buildParams = useCallback((page: number): VenueFilterParams => {
    const params: VenueFilterParams = {
      lat: DEFAULT_REGION.latitude,
      lon: DEFAULT_REGION.longitude,
      limit: PAGE_SIZE,
      page,
    };
    if (filters.noLoudMusic) params.noise_level = 'quiet';
    if (maxPrice < 10 || minPrice > 1) params.max_price = maxPrice;
    return params;
  }, [filters.noLoudMusic, maxPrice, minPrice]);

  useEffect(() => {
    const generation = requestGeneration.current + 1;
    requestGeneration.current = generation;
    loadingMoreRef.current = false;
    (async () => {
      setLoading(true);
      setLoadError(false);
      setLoadingMore(false);
      setLoadMoreError(false);
      setVenues([]);
      try {
        const response = await fetchVenues(buildParams(1));
        if (requestGeneration.current === generation) {
          setVenues(response.items.map(mapVenue).filter(venue => venue.price >= minPrice));
          setNextPage(2);
          setHasMore(response.has_more && response.items.length > 0);
        }
      } catch {
        if (requestGeneration.current === generation) {
          setVenues([]);
          setLoadError(true);
        }
      }
      if (requestGeneration.current === generation) setLoading(false);
    })();
    return () => {
      if (requestGeneration.current === generation) requestGeneration.current += 1;
    };
  }, [buildParams, minPrice, reloadKey]);

  const loadMore = useCallback(async (retry = false) => {
    if (loading || loadingMoreRef.current || !hasMore || loadError || (loadMoreError && !retry)) return;
    const generation = requestGeneration.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      const response = await fetchVenues(buildParams(nextPage));
      if (requestGeneration.current === generation) {
        const incoming = response.items.map(mapVenue).filter(venue => venue.price >= minPrice);
        setVenues(current => {
          const knownIds = new Set(current.map(venue => venue.id));
          return [...current, ...incoming.filter(venue => !knownIds.has(venue.id))];
        });
        setNextPage(page => page + 1);
        setHasMore(response.has_more && response.items.length > 0);
      }
    } catch {
      if (requestGeneration.current === generation) setLoadMoreError(true);
    } finally {
      loadingMoreRef.current = false;
      if (requestGeneration.current === generation) setLoadingMore(false);
    }
  }, [buildParams, hasMore, loadError, loadMoreError, loading, minPrice, nextPage]);

  const results = useMemo(() => {
    return venues.filter(venue => {
      const matchesQuery = fuzzyMatch(venue.name, query) || fuzzyMatch(venue.type, query);
      const matchesRating = !filters.fourPlusStars || venue.rating >= 4;
      return matchesQuery && matchesRating;
    });
  }, [venues, filters.fourPlusStars, query]);
  const clusters = useMemo(() => clusterVenues(results, mapRegion), [results, mapRegion]);
  const showMarkerDetails = mapRegion.latitudeDelta <= 0.004;

  function markerBusyness(venue: Venue) {
    const label = venue.busynessLabel?.toLowerCase() ?? '';
    if (label.includes('quiet') || label.includes('low')) return { label: t('venue.busyLow'), color: '#16a34a' };
    if (label.includes('busy') || label.includes('high') || label.includes('crowd')) return { label: t('venue.busyHigh'), color: '#dc2626' };
    if (label.includes('moderate') || label.includes('medium')) return { label: t('venue.busyMedium'), color: '#f59e0b' };
    return { label: t('venue.busyUnavailable'), color: tc.textMuted };
  }

  function togglePrice(min: number, max: number) {
    if (priceRange[0] === min && priceRange[1] === max) setPriceRange([1, 10]);
    else setPriceRange([min, max]);
  }

  return (
    <View style={[styles.container, { backgroundColor: tc.background }]}>
      <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: tc.white, borderBottomColor: tc.border }]}>
        <View style={styles.topPanel}>
          <TextInput
            style={[styles.searchInput, { borderColor: tc.border, backgroundColor: tc.surface, color: tc.text }]}
            placeholder={t('search.placeholder')}
            placeholderTextColor={tc.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          <View style={styles.filtersRow}>
            <FilterChip label={t('search.noLoudMusic')} selected={filters.noLoudMusic} onPress={() => setFilters(f => ({ ...f, noLoudMusic: !f.noLoudMusic }))} />
            <FilterChip label={t('search.fourStars')} selected={filters.fourPlusStars} onPress={() => setFilters(f => ({ ...f, fourPlusStars: !f.fourPlusStars }))} />
          </View>
          <View style={styles.priceRow}>
            <Pressable style={[styles.priceBtn, { borderColor: tc.border }, priceRange[0] === 1 && priceRange[1] === 5 && { borderColor: tc.primary, backgroundColor: tc.primary }]} onPress={() => togglePrice(1, 5)}>
              <Text style={[styles.priceBtnText, { color: tc.textMuted }, priceRange[0] === 1 && priceRange[1] === 5 && { color: tc.white, fontWeight: '600' }]}>{t('search.price1to5')}</Text>
            </Pressable>
            <Pressable style={[styles.priceBtn, { borderColor: tc.border }, priceRange[0] === 5 && priceRange[1] === 10 && { borderColor: tc.primary, backgroundColor: tc.primary }]} onPress={() => togglePrice(5, 10)}>
              <Text style={[styles.priceBtnText, { color: tc.textMuted }, priceRange[0] === 5 && priceRange[1] === 10 && { color: tc.white, fontWeight: '600' }]}>{t('search.price5to10')}</Text>
            </Pressable>
          </View>
          <View style={styles.toggleRow}>
            <Pressable style={[styles.toggleBtn, { borderColor: tc.border, backgroundColor: tc.white }, viewMode === 'list' && { borderColor: tc.primary, backgroundColor: tc.primary }]} onPress={() => setViewMode('list')}>
              <Text style={[styles.toggleText, { color: tc.textMuted }, viewMode === 'list' && { color: tc.white }]} >{t('search.list')}</Text>
            </Pressable>
            <Pressable style={[styles.toggleBtn, { borderColor: tc.border, backgroundColor: tc.white }, viewMode === 'map' && { borderColor: tc.primary, backgroundColor: tc.primary }]} onPress={() => setViewMode('map')}>
              <Text style={[styles.toggleText, { color: tc.textMuted }, viewMode === 'map' && { color: tc.white }]} >{t('search.map')}</Text>
            </Pressable>
          </View>
          <Text style={[styles.resultCount, { color: tc.textMuted }]}>{results.length} {t('search.spaces')}</Text>
        </View>
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator size="large" color={tc.primary} style={{ marginTop: spacing.xl }} />
      ) : loadError ? (
        <View style={styles.errorWrap}>
          <Text style={[styles.errorTitle, { color: tc.text }]}>{t('common.error')}</Text>
          <Text style={[styles.errorText, { color: tc.textMuted }]}>{t('home.loadErrorDesc')}</Text>
          <PrimaryButton label={t('home.refresh')} onPress={() => setReloadKey(key => key + 1)} />
        </View>
      ) : viewMode === 'list' ? (
        <FlatList
          style={[styles.listWrap, { backgroundColor: tc.background }]}
          contentContainerStyle={styles.listContent}
          data={results}
          keyExtractor={venue => venue.id}
          renderItem={({ item }) => (
            <VenueCard venue={item} onPress={() => navigation.navigate('VenueDetail', { venueId: item.id })} />
          )}
          ListEmptyComponent={<Text style={[styles.noResults, { color: tc.textMuted }]}>{t('search.noResults')}</Text>}
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator size="small" color={tc.primary} style={styles.loadMore} />
              : loadMoreError
                ? (
                  <Pressable style={styles.loadMoreRetry} onPress={() => { loadMore(true).catch(() => {}); }}>
                    <Text style={[styles.loadMoreRetryText, { color: tc.primary }]}>{t('home.refresh')}</Text>
                  </Pressable>
                )
                : null
          }
          onEndReached={() => { loadMore().catch(() => {}); }}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={DEFAULT_REGION}
            onRegionChangeComplete={setMapRegion}
            scrollEnabled
            zoomEnabled
            rotateEnabled
          >
            {clusters.map(cluster => cluster.venues.length === 1 ? (() => {
              const venue = cluster.venues[0];
              const busyness = markerBusyness(venue);
              return (
                <Marker
                  key={venue.id}
                  coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
                  title={venue.name}
                  description={`${venue.type} · ${busyness.label} · $${venue.price}/hr`}
                  tracksViewChanges={false}
                  onPress={() => setSelectedVenue(venue)}
                >
                  {showMarkerDetails ? (
                    <View style={[styles.venueMarker, { backgroundColor: tc.white, borderColor: tc.primary }]}>
                      <Text style={[styles.venueMarkerType, { color: tc.text }]} numberOfLines={1}>{venue.type}</Text>
                      <View style={styles.venueMarkerBusyRow}>
                        <View style={[styles.venueMarkerDot, { backgroundColor: busyness.color }]} />
                        <Text style={[styles.venueMarkerBusyText, { color: tc.textMuted }]}>{busyness.label}</Text>
                      </View>
                    </View>
                  ) : <View style={[styles.venueMarkerPin, { backgroundColor: busyness.color, borderColor: tc.white }]} />}
                </Marker>
              );
            })() : (
              <Marker
                key={`cluster-${cluster.id}`}
                coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
                onPress={() => mapRef.current?.animateToRegion({
                  latitude: cluster.latitude,
                  longitude: cluster.longitude,
                  latitudeDelta: Math.max(mapRegion.latitudeDelta / 2, 0.002),
                  longitudeDelta: Math.max(mapRegion.longitudeDelta / 2, 0.002),
                }, 280)}
              >
                <View style={[styles.clusterMarker, { backgroundColor: tc.primary, borderColor: tc.white }]}>
                  <Text style={styles.clusterText}>{cluster.venues.length}</Text>
                </View>
              </Marker>
            ))}
          </MapView>
          <View style={[styles.zoomControls, { backgroundColor: tc.white, borderColor: tc.border }]}>
            <Pressable style={styles.zoomBtn} onPress={() => {
              mapRef.current?.getCamera().then(cam => {
                mapRef.current?.animateCamera({ zoom: (cam.zoom || 14) + 1 }, { duration: 300 });
              });
            }}><Text style={[styles.zoomBtnText, { color: tc.text }]}>+</Text></Pressable>
            <View style={[styles.zoomDivider, { backgroundColor: tc.border }]} />
            <Pressable style={styles.zoomBtn} onPress={() => {
              mapRef.current?.getCamera().then(cam => {
                mapRef.current?.animateCamera({ zoom: (cam.zoom || 14) - 1 }, { duration: 300 });
              });
            }}><Text style={[styles.zoomBtnText, { color: tc.text }]}>−</Text></Pressable>
          </View>
        </View>
      )}

      <Modal visible={!!selectedVenue} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedVenue(null)}>
          <View style={styles.modalCardWrap} onStartShouldSetResponder={() => true}>
            {selectedVenue ? (
              <VenueCard venue={selectedVenue} onPress={() => { setSelectedVenue(null); navigation.navigate('VenueDetail', { venueId: selectedVenue.id }); }} />
            ) : null}
            <Pressable style={[styles.closeBtn, { backgroundColor: tc.white }]} onPress={() => setSelectedVenue(null)}>
              <Text style={[styles.closeBtnText, { color: tc.primary }]}>{t('search.close')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { borderBottomWidth: 1 },
  topPanel: { padding: spacing.md, borderBottomWidth: 0 },
  searchInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, marginBottom: spacing.sm },
  filtersRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  priceRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  priceBtn: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  priceBtnText: { fontSize: 12 },
  toggleRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.sm },
  toggleBtn: { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingVertical: spacing.sm, alignItems: 'center' },
  toggleText: { fontSize: 15, fontWeight: '600' },
  resultCount: { fontSize: 13, textAlign: 'center', marginTop: spacing.xs },
  listWrap: { flex: 1 },
  listContent: { padding: spacing.md, paddingBottom: spacing.xl },
  loadMore: { marginVertical: spacing.md },
  loadMoreRetry: { alignItems: 'center', paddingVertical: spacing.md },
  loadMoreRetryText: { fontSize: 14, fontWeight: '600' },
  noResults: { textAlign: 'center', marginTop: spacing.xl, fontSize: 15 },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  errorTitle: { fontSize: 18, fontWeight: '700' },
  errorText: { textAlign: 'center', marginBottom: spacing.sm },
  mapWrap: { flex: 1 },
  map: { width: '100%', height: '100%' },
  venueMarker: { minWidth: 88, maxWidth: 122, borderWidth: 2, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 2 },
  venueMarkerPin: { width: 20, height: 20, borderRadius: 10, borderWidth: 3, elevation: 3 },
  venueMarkerType: { fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
  venueMarkerBusyRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  venueMarkerDot: { width: 7, height: 7, borderRadius: 4 },
  venueMarkerBusyText: { fontSize: 11, fontWeight: '600' },
  clusterMarker: { minWidth: 38, height: 38, paddingHorizontal: 8, borderRadius: 19, borderWidth: 3, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  clusterText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  zoomControls: { position: 'absolute', right: 12, bottom: 30, borderRadius: 10, borderWidth: 1, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3 },
  zoomBtn: { width: 40, height: 36, alignItems: 'center', justifyContent: 'center' },
  zoomDivider: { height: 1, marginHorizontal: 6 },
  zoomBtnText: { fontSize: 20, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCardWrap: { padding: spacing.md, paddingBottom: spacing.lg },
  closeBtn: { alignSelf: 'center', marginTop: spacing.md, borderRadius: 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  closeBtnText: { fontSize: 14, fontWeight: '600' },
});

import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FilterChip } from '../../components/FilterChip';
import { VenueCard } from '../../components/VenueCard';
import { fetchVenues } from '../../services/venues';
import { mapVenue } from '../../utils/mapVenue';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { MainTabScreenProps } from '../../types/navigation';
import type { Venue } from '../../types/venue';

type SearchViewMode = 'list' | 'map';
const DEFAULT_REGION: Region = { latitude: 40.7831, longitude: -73.9712, latitudeDelta: 0.05, longitudeDelta: 0.05 };

function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return true;
  if (t.includes(q)) return true;
  return q.split(/\s+/).every(w => t.includes(w));
}

export function SearchScreen({ navigation }: MainTabScreenProps<'Search'>) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<SearchViewMode>('list');
  const [filters, setFilters] = useState({ noLoudMusic: false, fourPlusStars: false });
  const [priceRange, setPriceRange] = useState<[number, number]>([1, 10]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [mapInit, setMapInit] = useState(false);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    (async () => {
      try {
        const params: any = { lat: 40.7831, lon: -73.9712, limit: 50 };
        if (filters.noLoudMusic) params.noise_level = 'quiet';
        if (priceRange[1] < 10) params.max_price = priceRange[1];
        const r = await fetchVenues(params);
        setVenues(r.items.map(mapVenue));
      } catch {}
      setLoading(false);
    })();
  }, [filters.noLoudMusic, priceRange[1]]);

  const results = useMemo(() => {
    return venues.filter(venue => {
      const matchesQuery = fuzzyMatch(venue.name, query) || fuzzyMatch(venue.type, query);
      const matchesRating = !filters.fourPlusStars || venue.rating >= 4;
      return matchesQuery && matchesRating;
    });
  }, [venues, filters.fourPlusStars, query]);

  const mapRegion = useMemo(() => {
    if (results.length === 0) return DEFAULT_REGION;
    const lats = results.map(v => v.lat ?? 0).filter(Boolean);
    const lngs = results.map(v => v.lng ?? 0).filter(Boolean);
    if (lats.length === 0) return DEFAULT_REGION;
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    return { latitude: (minLat + maxLat) / 2, longitude: (minLng + maxLng) / 2, latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.01), longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.01) };
  }, [results]);

  function togglePrice(min: number, max: number) {
    if (priceRange[0] === min && priceRange[1] === max) setPriceRange([1, 10]);
    else setPriceRange([min, max]);
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.topPanel}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search workspaces by name or type..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          <View style={styles.filtersRow}>
            <FilterChip label="No Loud Music" selected={filters.noLoudMusic} onPress={() => setFilters(f => ({ ...f, noLoudMusic: !f.noLoudMusic }))} />
            <FilterChip label="4+ Stars" selected={filters.fourPlusStars} onPress={() => setFilters(f => ({ ...f, fourPlusStars: !f.fourPlusStars }))} />
          </View>
          <View style={styles.priceRow}>
            <Pressable style={[styles.priceBtn, priceRange[0] === 1 && priceRange[1] === 5 && styles.priceBtnActive]} onPress={() => togglePrice(1, 5)}>
              <Text style={[styles.priceBtnText, priceRange[0] === 1 && priceRange[1] === 5 && styles.priceBtnTextActive]}>$1–5</Text>
            </Pressable>
            <Pressable style={[styles.priceBtn, priceRange[0] === 5 && priceRange[1] === 10 && styles.priceBtnActive]} onPress={() => togglePrice(5, 10)}>
              <Text style={[styles.priceBtnText, priceRange[0] === 5 && priceRange[1] === 10 && styles.priceBtnTextActive]}>$5–10</Text>
            </Pressable>
          </View>
          <View style={styles.toggleRow}>
            <Pressable style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]} onPress={() => setViewMode('list')}>
              <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>List</Text>
            </Pressable>
            <Pressable style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]} onPress={() => setViewMode('map')}>
              <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>Map</Text>
            </Pressable>
          </View>
          <Text style={styles.resultCount}>{results.length} spaces</Text>
        </View>
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : viewMode === 'list' ? (
        <ScrollView style={styles.listWrap} showsVerticalScrollIndicator={false}>
          {results.map(venue => (
            <VenueCard key={venue.id} venue={venue} onPress={() => navigation.navigate('VenueDetail', { venueId: venue.id })} />
          ))}
          {results.length === 0 ? <Text style={styles.noResults}>No matching workspaces found</Text> : null}
        </ScrollView>
      ) : (
        <View style={styles.mapWrap}>
          <MapView ref={mapRef} style={styles.map} initialRegion={DEFAULT_REGION} scrollEnabled zoomEnabled rotateEnabled onMapReady={() => setMapInit(true)}>
            {results.map(venue =>
              venue.lat != null && venue.lng != null ? (
                <Marker key={venue.id} coordinate={{ latitude: venue.lat, longitude: venue.lng }} title={venue.name} description={`$${venue.price}/hr  ★ ${venue.rating}`} pinColor="red" onPress={() => setSelectedVenue(venue)} />
              ) : null,
            )}
          </MapView>
          <View style={styles.zoomControls}>
            <Pressable style={styles.zoomBtn} onPress={() => {
              mapRef.current?.getCamera().then(cam => {
                mapRef.current?.animateCamera({ zoom: (cam.zoom || 14) + 1 }, { duration: 300 });
              });
            }}><Text style={styles.zoomBtnText}>+</Text></Pressable>
            <View style={styles.zoomDivider} />
            <Pressable style={styles.zoomBtn} onPress={() => {
              mapRef.current?.getCamera().then(cam => {
                mapRef.current?.animateCamera({ zoom: (cam.zoom || 14) - 1 }, { duration: 300 });
              });
            }}><Text style={styles.zoomBtnText}>−</Text></Pressable>
          </View>
        </View>
      )}

      <Modal visible={!!selectedVenue} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedVenue(null)}>
          <View style={styles.modalCardWrap} onStartShouldSetResponder={() => true}>
            {selectedVenue ? (
              <VenueCard venue={selectedVenue} onPress={() => { setSelectedVenue(null); navigation.navigate('VenueDetail', { venueId: selectedVenue.id }); }} />
            ) : null}
            <Pressable style={styles.closeBtn} onPress={() => setSelectedVenue(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeArea: { backgroundColor: colors.white },
  topPanel: { padding: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, color: colors.text, backgroundColor: colors.surface, marginBottom: spacing.sm },
  filtersRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  priceRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  priceBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  priceBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  priceBtnText: { fontSize: 12, color: colors.textMuted },
  priceBtnTextActive: { color: colors.white, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.sm },
  toggleBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingVertical: spacing.sm, alignItems: 'center', backgroundColor: colors.white },
  toggleBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  toggleText: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
  toggleTextActive: { color: colors.white },
  resultCount: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs },
  listWrap: { flex: 1, padding: spacing.md },
  noResults: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl, fontSize: 15 },
  mapWrap: { flex: 1 },
  map: { width: '100%', height: '100%' },
  zoomControls: { position: 'absolute', right: 12, bottom: 30, backgroundColor: colors.white, borderRadius: 10, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3 },
  zoomBtn: { width: 40, height: 36, alignItems: 'center', justifyContent: 'center' },
  zoomDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 6 },
  zoomBtnText: { fontSize: 20, fontWeight: '600', color: colors.text },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCardWrap: { padding: spacing.md, paddingBottom: spacing.lg },
  closeBtn: { alignSelf: 'center', marginTop: spacing.md, backgroundColor: colors.white, borderRadius: 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  closeBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
});

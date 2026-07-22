import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../../components/Logo';
import { VenueCard } from '../../components/VenueCard';
import { fetchVenues } from '../../services/venues';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { MainTabScreenProps } from '../../types/navigation';
import type { VenueItem } from '../../types/venue';

const MANHATTAN = {
  latitude: 40.7831,
  longitude: -73.9712,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

type ViewMode = 'list' | 'map';
type BooleanFilterKey =
  | 'wifi'
  | 'plugs'
  | 'callsAllowed'
  | 'accessibilityFriendly'
  | 'wbeCertified'
  | 'mbeCertified'
  | 'vbeCertified'
  | 'bcorpCertified'
  | 'lgbtFriendly';

const VENUE_TYPES = ['cafe', 'library', 'restaurant', 'workspace', 'office', 'hotel'];

export function SearchScreen({ navigation }: MainTabScreenProps<'Search'>) {
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<BooleanFilterKey, boolean>>({
    wifi: false,
    plugs: false,
    callsAllowed: false,
    accessibilityFriendly: false,
    wbeCertified: false,
    mbeCertified: false,
    vbeCertified: false,
    bcorpCertified: false,
    lgbtFriendly: false,
  });
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [searchDate, setSearchDate] = useState('');
  const [startTime, setStartTime] = useState('');

  useEffect(() => {
    loadVenues();
  }, [query, filters, selectedTypes, searchDate, startTime]);

  async function loadVenues() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchVenues({
        lat: 40.7831,
        lon: -73.9712,
        radius: 10,
        limit: 50,
        name: query.trim() || undefined,
        wifi: filters.wifi ? true : undefined,
        plug_access: filters.plugs ? 1 : undefined,
        venue_type: selectedTypes.length > 0 ? selectedTypes : undefined,
        calls_allowed: filters.callsAllowed ? true : undefined,
        accessibility_friendly: filters.accessibilityFriendly ? true : undefined,
        wbe_certified: filters.wbeCertified ? true : undefined,
        mbe_certified: filters.mbeCertified ? true : undefined,
        vbe_certified: filters.vbeCertified ? true : undefined,
        bcorp_certified: filters.bcorpCertified ? true : undefined,
        lgbt_friendly: filters.lgbtFriendly ? true : undefined,
        date: searchDate || undefined,
        start_time: startTime ? `${startTime}:00` : undefined,
      });
      setVenues(response.items);
    } catch {
      setVenues([]);
      setError('Could not load venues. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => venues, [venues]);

  function toggleFilter(key: BooleanFilterKey) {
    setFilters(current => ({ ...current, [key]: !current[key] }));
  }

  function toggleVenueType(type: string) {
    setSelectedTypes(current =>
      current.includes(type)
        ? current.filter(item => item !== type)
        : [...current, type],
    );
  }

  function clearAll() {
    setFilters({
      wifi: false,
      plugs: false,
      callsAllowed: false,
      accessibilityFriendly: false,
      wbeCertified: false,
      mbeCertified: false,
      vbeCertified: false,
      bcorpCertified: false,
      lgbtFriendly: false,
    });
    setSelectedTypes([]);
    setSearchDate('');
    setStartTime('');
    setQuery('');
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <Logo />
      </SafeAreaView>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by city or venue name..."
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersRow}>
        {[
          ['wifi', 'WiFi'],
          ['plugs', 'Plugs'],
          ['callsAllowed', 'Calls'],
          ['accessibilityFriendly', 'Accessible'],
          ['wbeCertified', 'WBE'],
          ['mbeCertified', 'MBE'],
          ['vbeCertified', 'VBE'],
          ['bcorpCertified', 'B-Corp'],
          ['lgbtFriendly', 'LGBT+'],
        ].map(([key, label]) => (
          <Pressable
            key={key}
            style={[styles.filterPill, filters[key as BooleanFilterKey] && styles.filterPillActive]}
            onPress={() => toggleFilter(key as BooleanFilterKey)}
          >
            <Text style={[styles.filterText, filters[key as BooleanFilterKey] && styles.filterTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersRow}>
        {VENUE_TYPES.map(type => (
          <Pressable
            key={type}
            style={[styles.filterPill, selectedTypes.includes(type) && styles.filterPillActive]}
            onPress={() => toggleVenueType(type)}
          >
            <Text style={[styles.filterText, selectedTypes.includes(type) && styles.filterTextActive]}>{type}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.availabilityRow}>
        <TextInput
          style={styles.smallInput}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textMuted}
          value={searchDate}
          onChangeText={setSearchDate}
        />
        <TextInput
          style={styles.smallInput}
          placeholder="HH:MM"
          placeholderTextColor={colors.textMuted}
          value={startTime}
          onChangeText={setStartTime}
        />
        <Pressable style={styles.clearBtn} onPress={clearAll}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      </View>

      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleBtn, viewMode === 'list' && styles.toggleActive]}
          onPress={() => setViewMode('list')}
        >
          <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>List</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, viewMode === 'map' && styles.toggleActive]}
          onPress={() => setViewMode('map')}
        >
          <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>Map</Text>
        </Pressable>
      </View>

      <Text style={styles.resultCount}>{filtered.length} spaces available</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : null}

      {viewMode === 'map' ? (
        <View style={styles.mapWrapper}>
          <MapView
            style={styles.map}
            initialRegion={MANHATTAN}
            showsUserLocation={false}
          >
            {filtered
              .filter(v => v.lat != null && v.lon != null)
              .map(venue => (
                <Marker
                  key={venue.venue_id}
                  coordinate={{ latitude: venue.lat!, longitude: venue.lon! }}
                  title={venue.name}
                  description={venue.rating ? `★ ${venue.rating}` : undefined}
                />
              ))}
          </MapView>
        </View>
      ) : null}

      <View style={styles.listContainer}>
        {filtered.map(venue => (
          <VenueCard
            key={venue.venue_id}
            venue={venue}
            onPress={() =>
              navigation.navigate('VenueDetail', { venueId: venue.venue_id })
            }
            onBook={() =>
              navigation.navigate('VenueDetail', { venueId: venue.venue_id })
            }
          />
        ))}
        {filtered.length === 0 && !loading ? (
          <Text style={styles.emptyText}>No results found.</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  filtersScroll: {
    marginTop: spacing.sm,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  filterPill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  filterPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  filterText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  filterTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  availabilityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  smallInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.text,
    backgroundColor: colors.white,
    fontSize: 13,
  },
  clearBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  clearText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  toggleRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 3,
    marginVertical: spacing.sm,
  },
  toggleBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  toggleActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    color: colors.textMuted,
    fontWeight: '500',
    fontSize: 14,
  },
  toggleTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  resultCount: {
    color: colors.textMuted,
    fontSize: 13,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  loading: {
    marginBottom: spacing.sm,
  },
  mapWrapper: {
    height: 240,
    marginHorizontal: spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  map: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.lg,
  },
});

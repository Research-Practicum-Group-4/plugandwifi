import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../../components/Logo';
import { PrimaryButton } from '../../components/PrimaryButton';
import { VenueCard } from '../../components/VenueCard';
import { fetchVenues } from '../../services/venues';
import { mockVenues } from '../../data/mockVenues';
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

export function SearchScreen({ navigation }: MainTabScreenProps<'Search'>) {
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVenues();
  }, []);

  async function loadVenues() {
    setLoading(true);
    try {
      const response = await fetchVenues({
        lat: 40.7831,
        lon: -73.9712,
        radius: 10,
        limit: 20,
      });
      if (response.items.length > 0) {
        setVenues(response.items);
      } else {
        setVenues(mockVenues);
      }
    } catch {
      setVenues(mockVenues);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (query.trim().length === 0) return venues;
    const q = query.toLowerCase();
    return venues.filter(v =>
      v.name.toLowerCase().includes(q) ||
      (v.cuisine_type ?? '').toLowerCase().includes(q) ||
      (v.borough ?? '').toLowerCase().includes(q)
    );
  }, [venues, query]);

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

      <View style={styles.filtersRow}>
        {['No Loud Music', 'Calls Allowed', '4+ Stars'].map(label => (
          <Pressable key={label} style={styles.filterPill}>
            <Text style={styles.filterText}>{label}</Text>
          </Pressable>
        ))}
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
  filtersRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  filterPill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  filterText: {
    color: colors.textMuted,
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

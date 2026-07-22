import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search } from 'lucide-react-native';
import { Logo } from '../../components/Logo';
import { PrimaryButton } from '../../components/PrimaryButton';
import { VenueCard } from '../../components/VenueCard';
import { fetchVenues } from '../../services/venues';
import { mockVenues } from '../../data/mockVenues';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { MainTabScreenProps } from '../../types/navigation';
import type { VenueItem } from '../../types/venue';

const MANHATTAN: Region = {
  latitude: 40.7831,
  longitude: -73.9712,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const COLLAPSED_SHEET = 180;
const SHEET_HANDLE = 28;

export function HomeScreen({ navigation }: MainTabScreenProps<'Home'>) {
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const mapRef = useRef<MapView>(null);
  const sheetAnim = useRef(new Animated.Value(COLLAPSED_SHEET)).current;
  const isExpanded = useRef(false);

  useEffect(() => {
    loadVenues();
  }, []);

  async function loadVenues() {
    setLoading(true);
    setError(null);
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
      setError(null);
    } finally {
      setLoading(false);
    }
  }

  const handleMarkerPress = useCallback((venue: VenueItem) => {
    if (venue.lat != null && venue.lon != null) {
      mapRef.current?.animateToRegion(
        {
          latitude: venue.lat,
          longitude: venue.lon,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        500,
      );
    }
  }, []);

  function toggleSheet() {
    const screenHeight = Dimensions.get('window').height;
    const toValue = isExpanded.current
      ? COLLAPSED_SHEET
      : screenHeight * 0.55;
    Animated.spring(sheetAnim, {
      toValue,
      useNativeDriver: false,
      friction: 8,
    }).start();
    isExpanded.current = !isExpanded.current;
  }

  function handleSearchSubmit() {
    navigation.navigate('Search');
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <Logo />
      </SafeAreaView>

      <View style={styles.searchSection}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by city or venue..."
            placeholderTextColor={colors.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          <Pressable style={styles.searchBtn} onPress={handleSearchSubmit}>
            <Text style={styles.searchBtnText}>Search</Text>
          </Pressable>
        </View>
        <View style={styles.filtersRow}>
          {['WiFi', 'Plug Access', 'Calls Allowed'].map(label => (
            <View key={label} style={styles.filterPill}>
              <Text style={styles.filterText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={MANHATTAN}
          showsUserLocation={false}
          showsMyLocationButton={false}
        >
          {venues
            .filter(v => v.lat != null && v.lon != null)
            .map(venue => (
              <Marker
                key={venue.venue_id}
                coordinate={{ latitude: venue.lat!, longitude: venue.lon! }}
                title={venue.name}
                description={venue.rating ? `★ ${venue.rating}` : undefined}
                onPress={() => handleMarkerPress(venue)}
              />
            ))}
        </MapView>

        {loading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Finding workspaces...</Text>
          </View>
        ) : null}

        <Pressable
          style={styles.floatingSearch}
          onPress={() => navigation.navigate('Search')}
        >
          <Search size={22} color={colors.white} />
        </Pressable>
      </View>

      <Animated.View style={[styles.sheet, { height: sheetAnim }]}>
        <Pressable style={styles.sheetHandle} onPress={toggleSheet}>
          <View style={styles.handleBar} />
        </Pressable>

        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>
            {venues.length > 0
              ? `${venues.length} workspaces nearby`
              : 'Find Your Workspace'}
          </Text>
          <Pressable onPress={toggleSheet}>
            <Text style={styles.expandLink}>
              {isExpanded.current ? 'Collapse' : 'See all'}
            </Text>
          </Pressable>
        </View>

        {!loading && venues.length === 0 ? (
          <View style={styles.noResults}>
            <Text style={styles.noResultsTitle}>No venues found</Text>
            <Text style={styles.noResultsText}>
              Try expanding your search or check back later.
            </Text>
            <PrimaryButton label="Refresh" onPress={loadVenues} />
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
            nestedScrollEnabled
          >
            {venues.map(venue => (
              <VenueCard
                key={venue.venue_id}
                venue={venue}
                compact
                onPress={() =>
                  navigation.navigate('VenueDetail', { venueId: venue.venue_id })
                }
                onBook={() =>
                  navigation.navigate('VenueDetail', { venueId: venue.venue_id })
                }
              />
            ))}
          </ScrollView>
        )}
      </Animated.View>
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
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
    height: 44,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    height: 44,
  },
  searchBtnText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 15,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  mapContainer: {
    flex: 1,
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 15,
  },
  floatingSearch: {
    position: 'absolute',
    bottom: COLLAPSED_SHEET - SHEET_HANDLE + 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  sheetHandle: {
    height: SHEET_HANDLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  expandLink: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  carouselContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  noResultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  noResultsText: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 13,
  },
});

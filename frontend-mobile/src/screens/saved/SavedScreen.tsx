import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Heart, X } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { VenueCard } from '../../components/VenueCard';
import { fetchVenueById } from '../../services/venues';
import { mapVenue } from '../../utils/mapVenue';
import { useFavorites } from '../../context/FavoriteContext';
import { useAlerts } from '../../context/AlertContext';
import { useT } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../theme/spacing';
import type { MainTabScreenProps } from '../../types/navigation';
import type { Venue } from '../../types/venue';

export function SavedScreen({ navigation }: MainTabScreenProps<'Saved'>) {
  const { t } = useT();
  const { colors: tc } = useTheme();
  const { ids } = useFavorites();
  const { toggleAlert, isAlertOn } = useAlerts();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertVenue, setAlertVenue] = useState<Venue | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        const idList = Array.from(ids);
        if (idList.length === 0) { setVenues([]); setLoading(false); return; }
        // Fetch each favorite by id so venues outside the default
        // search radius / page limit are not silently dropped
        const results = await Promise.all(idList.map(id => fetchVenueById(id).catch(() => null)));
        if (cancelled) return;
        setVenues(results.filter(v => v != null).map(mapVenue));
        setLoading(false);
      })();
      return () => { cancelled = true; };
    }, [ids]),
  );

  function openAlertDrawer(venue: Venue) {
    setAlertVenue(venue);
  }

  return (
    <View style={[styles.container, { backgroundColor: tc.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: tc.text }]}>{t('saved.title')}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={tc.primary} style={{ marginTop: spacing.xl }} />
      ) : venues.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: tc.white, borderColor: tc.border }]}>
          <Heart size={40} color={tc.textMuted} />
          <Text style={[styles.emptyTitle, { color: tc.text }]}>{t('saved.empty')}</Text>
          <Text style={[styles.emptySubtitle, { color: tc.textMuted }]}>{t('saved.emptyDesc')}</Text>
          <PrimaryButton label={t('saved.browse')} onPress={() => navigation.navigate('Home')} />
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {venues.map(venue => (
            <VenueCard
              key={venue.id}
              venue={venue}
              alertOn={isAlertOn(venue.id)}
              onPress={() => navigation.navigate('VenueDetail', { venueId: venue.id })}
              onBell={() => openAlertDrawer(venue)}
            />
          ))}
        </ScrollView>
      )}

      <Modal visible={!!alertVenue} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setAlertVenue(null)}>
          <View style={[styles.drawer, { backgroundColor: tc.white }]}>
            <View style={styles.drawerHandle}>
              <View style={[styles.handleBar, { backgroundColor: tc.border }]} />
            </View>
            <View style={styles.drawerHeader}>
              <Text style={[styles.drawerTitle, { color: tc.text }]}>{t('saved.alertTitle')}</Text>
              <Pressable onPress={() => setAlertVenue(null)}><X size={20} color={tc.textMuted} /></Pressable>
            </View>
            {alertVenue ? (
              <>
                <Text style={[styles.drawerSubtitle, { color: tc.text }]}>{alertVenue.name}</Text>
                <Text style={[styles.drawerBody, { color: tc.textMuted }]}>{t('saved.alertBody')}</Text>
                <PrimaryButton
                  label={isAlertOn(alertVenue.id) ? t('saved.alertRemove') : t('saved.alertEnable')}
                  variant={isAlertOn(alertVenue.id) ? 'outline' : 'primary'}
                  onPress={() => { toggleAlert(alertVenue.id); setAlertVenue(null); }}
                />
              </>
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: 28, fontWeight: '700' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.md, gap: spacing.sm, borderRadius: 12, borderWidth: 1, margin: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptySubtitle: { textAlign: 'center', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  drawer: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  drawerHandle: { alignItems: 'center' },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  drawerTitle: { fontSize: 18, fontWeight: '700' },
  drawerSubtitle: { fontSize: 15, fontWeight: '600' },
  drawerBody: { lineHeight: 20 },
});

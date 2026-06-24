import { useCallback, useEffect, useState } from 'react';
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
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { MainTabScreenProps } from '../../types/navigation';
import type { Venue } from '../../types/venue';

export function SavedScreen({ navigation }: MainTabScreenProps<'Saved'>) {
  const { t } = useT();
  const { ids } = useFavorites();
  const { toggleAlert, isAlertOn } = useAlerts();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertVenue, setAlertVenue] = useState<Venue | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        const idList = Array.from(ids);
        if (idList.length === 0) { setVenues([]); setLoading(false); return; }
        const results = await Promise.allSettled(idList.map(fetchVenueById));
        const loaded: Venue[] = [];
        results.forEach(r => { if (r.status === 'fulfilled' && r.value) loaded.push(mapVenue(r.value)); });
        setVenues(loaded);
        setLoading(false);
      })();
    }, [ids]),
  );

  function openAlertDrawer(venue: Venue) {
    setAlertVenue(venue);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('saved.title')}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : venues.length === 0 ? (
        <View style={styles.emptyState}>
          <Heart size={40} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>{t('saved.empty')}</Text>
          <Text style={styles.emptySubtitle}>{t('saved.emptyDesc')}</Text>
          <PrimaryButton label={t('saved.browse')} onPress={() => navigation.navigate('Home')} />
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {venues.map(venue => (
            <VenueCard
              key={venue.id}
              venue={venue}
              saved
              alertOn={isAlertOn(venue.id)}
              onPress={() => navigation.navigate('VenueDetail', { venueId: venue.id })}
              onBell={() => openAlertDrawer(venue)}
            />
          ))}
        </ScrollView>
      )}

      <Modal visible={!!alertVenue} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setAlertVenue(null)}>
          <View style={styles.drawer}>
            <View style={styles.drawerHandle} />
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>{t('saved.alertTitle')}</Text>
              <Pressable onPress={() => setAlertVenue(null)}><X size={20} color={colors.textMuted} /></Pressable>
            </View>
            {alertVenue ? (
              <>
                <Text style={styles.drawerSubtitle}>{alertVenue.name}</Text>
                <Text style={styles.drawerBody}>{t('saved.alertBody')}</Text>
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
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.md, gap: spacing.sm },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  emptySubtitle: { color: colors.textMuted, textAlign: 'center', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  drawer: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  drawerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center' },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  drawerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  drawerSubtitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  drawerBody: { color: colors.textMuted, lineHeight: 20 },
});

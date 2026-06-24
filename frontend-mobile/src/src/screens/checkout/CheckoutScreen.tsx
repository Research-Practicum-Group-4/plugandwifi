import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Clock, MapPin, Calendar } from 'lucide-react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { fetchVenueById } from '../../services/venues';
import { createBooking } from '../../services/bookings';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackScreenProps } from '../../types/navigation';

const DURATIONS = [1, 2, 3];
const SERVICE_FEE = 2;
const TIME_SLOTS = [9, 11, 13, 15, 17, 19];

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0];
}
function fmtLabel(d: Date): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(d); target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtTime(h: number): string {
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return `${hour}:00 ${suffix}`;
}

export function CheckoutScreen({ navigation, route }: RootStackScreenProps<'Checkout'>) {
  const { venueId, venueName, duration: initDur, price: rawPrice } = route.params;
  const { user, token } = useAuth();
  const safePrice = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : 10;
  const safeDur = parseInt(initDur || '2') || 2;
  const [duration, setDuration] = useState(safeDur);
  const [price, setPrice] = useState(safePrice);
  const [address, setAddress] = useState('Manhattan');
  const [loadingVenue, setLoadingVenue] = useState(true);
  const [processing, setProcessing] = useState(false);

  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return d;
  }), []);
  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const [startHour, setStartHour] = useState(TIME_SLOTS[0]);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchVenueById(venueId);
        if (data) {
          const parts: string[] = [];
          if (data.building_number) parts.push(data.building_number);
          if (data.street) parts.push(data.street);
          if (data.borough) parts.push(data.borough);
          if (parts.length > 0) setAddress(parts.join(', '));
        }
      } catch {}
      setLoadingVenue(false);
    })();
  }, [venueId]);

  function selectDuration(h: number) {
    setDuration(h);
    const hourlyRate = safePrice / safeDur;
    setPrice(Number.isFinite(hourlyRate) ? hourlyRate * h : 5 * h);
  }

  const endHour = startHour + duration;

  async function handleBooking() {
    setProcessing(true);
    try {
      const res = await createBooking({
        user_id: user?.id ?? 1,
        venue_id: venueId,
        booking_date: fmtDate(selectedDate),
        start_time: `${String(startHour).padStart(2, '0')}:00:00`,
        end_time: `${String(endHour).padStart(2, '0')}:00:00`,
        seats_reserved: 1,
      }, token ?? undefined);
      Alert.alert('Booking Confirmed', `Order #${res.order_id} confirmed!`, [
        { text: 'OK', onPress: () => navigation.popToTop() },
      ]);
    } catch (e: any) {
      Alert.alert('Booking Failed', e.message || 'Please try again.');
    }
    setProcessing(false);
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={16}>
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Confirm Booking</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
        {/* Venue */}
        <View style={styles.venueSection}>
          <Text style={styles.venueName}>{venueName}</Text>
          {loadingVenue ? (
            <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" style={{ marginTop: 4 }} />
          ) : (
            <View style={styles.addressRow}>
              <MapPin size={13} color="rgba(255,255,255,0.85)" />
              <Text style={styles.addressText}>{address}</Text>
            </View>
          )}
        </View>

        {/* Date */}
        <View style={styles.sectionLabel}>Date</View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {dates.map(d => {
            const active = fmtDate(d) === fmtDate(selectedDate);
            const key = fmtDate(d);
            return (
              <Pressable
                key={key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSelectedDate(d)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{fmtLabel(d)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Time */}
        <View style={styles.sectionLabel}>Start Time</View>
        <View style={styles.timeRow}>
          {TIME_SLOTS.map(h => (
            <Pressable
              key={h}
              style={[styles.timeChip, startHour === h && styles.timeChipActive]}
              onPress={() => setStartHour(h)}
            >
              <Text style={[styles.timeChipText, startHour === h && styles.timeChipTextActive]}>{fmtTime(h)}</Text>
            </Pressable>
          ))}
        </View>

        {/* Duration */}
        <View style={styles.sectionLabel}>Duration</View>
        <View style={styles.durationRow}>
          {DURATIONS.map(h => (
            <Pressable
              key={h}
              style={[styles.durationBtn, duration === h && styles.durationBtnActive]}
              onPress={() => selectDuration(h)}
            >
              <Text style={[styles.durationText, duration === h && styles.durationTextActive]}>{h}h</Text>
            </Pressable>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.sectionLabel}>Summary</View>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              ${(price / duration).toFixed(0)}/hr × {duration}h
            </Text>
            <Text style={styles.summaryValue}>${price}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service fee</Text>
            <Text style={styles.summaryValue}>${SERVICE_FEE}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${price + SERVICE_FEE}</Text>
          </View>
        </View>

        {/* Time display */}
        <View style={styles.timeCard}>
          <Clock size={15} color={colors.textMuted} />
          <Text style={styles.timeCardText}>
            {fmtDate(selectedDate)} · {fmtTime(startHour)} – {fmtTime(endHour)}
          </Text>
        </View>

        <PrimaryButton
          label={processing ? 'Confirming...' : 'Confirm & Pay'}
          disabled={processing}
          onPress={handleBooking}
        />
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerSafe: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  body: { flex: 1 },
  bodyContent: { padding: spacing.lg, gap: spacing.md },
  venueSection: { backgroundColor: colors.primary, borderRadius: 16, padding: spacing.lg },
  venueName: { fontSize: 20, fontWeight: '700', color: colors.white },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  addressText: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.xs },
  chipRow: { gap: spacing.sm, paddingBottom: 4 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.white },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text, fontWeight: '500' },
  chipTextActive: { color: colors.white, fontWeight: '600' },
  timeRow: { flexDirection: 'row', gap: spacing.sm },
  timeChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.white },
  timeChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  timeChipText: { fontSize: 13, fontWeight: '500', color: colors.text },
  timeChipTextActive: { color: colors.white, fontWeight: '600' },
  durationRow: { flexDirection: 'row', gap: spacing.sm },
  durationBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: spacing.md, alignItems: 'center', backgroundColor: colors.white },
  durationBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  durationText: { fontSize: 16, fontWeight: '600', color: colors.text },
  durationTextActive: { color: colors.white },
  summaryCard: { backgroundColor: colors.white, borderRadius: 14, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14, color: colors.textMuted },
  summaryValue: { fontSize: 14, fontWeight: '500', color: colors.text },
  summaryDivider: { height: 1, backgroundColor: colors.border },
  totalLabel: { fontSize: 18, fontWeight: '700', color: colors.text },
  totalValue: { fontSize: 20, fontWeight: '700', color: colors.primary },
  timeCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderRadius: 10 },
  timeCardText: { fontSize: 14, color: colors.textMuted },
});

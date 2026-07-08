import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Clock, MapPin, Calendar, CheckCircle, XCircle, CreditCard } from 'lucide-react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { fetchVenueById } from '../../services/venues';
import { createBooking } from '../../services/bookings';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackScreenProps } from '../../types/navigation';

const DURATIONS = [1, 2, 3];
const SERVICE_FEE = 2;
const FALLBACK_SLOTS = (() => { const h: number[] = []; for (let i=8; i<=20; i++) h.push(i); return h; })();
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseTimeSlots(hoursStr: string | null | undefined, date: Date): number[] {
  if (!hoursStr) return FALLBACK_SLOTS;
  const dow = date.getDay(); // 0=Sun, 1=Mon...
  const dayKey = DAY_NAMES[dow];
  const ranges = hoursStr.split(';').map(s => s.trim());

  // Try exact day match first, then day range match
  let matchedRanges: string[] = [];
  for (const range of ranges) {
    const [days, times] = range.includes(' ') ? [range.split(' ')[0], range.split(' ').slice(1).join(' ')] : ['', range];
    const dayParts = days.split(',').map(d => d.trim());
    for (const dp of dayParts) {
        if (dp.includes('-')) {
        const [start, end] = dp.split('-').map(d => DAY_NAMES.indexOf(d));
        const inRange = end >= start ? (dow >= start && dow <= end) : (dow >= start || dow <= end);
        if (inRange) { matchedRanges.push(times); break; }
      } else if (dp === dayKey) {
        matchedRanges.push(times); break;
      }
    }
    // If no day specified, applies to all days
    if (!days) matchedRanges.push(times);
  }

  if (matchedRanges.length === 0) return FALLBACK_SLOTS;

  const slotsSet = new Set<number>();
  for (const tr of matchedRanges) {
    for (const part of tr.split(',')) {
      const [s, e] = part.trim().split('-');
      if (!s || !e) continue;
      const startH = parseInt(s.split(':')[0]);
      const startM = s.includes(':') ? parseInt(s.split(':')[1]) : 0;
      const endH = parseInt(e.split(':')[0]);
      const endM = e.includes(':') ? parseInt(e.split(':')[1]) : 0;
      // Only add slots where at least 1 full hour fits before close
      const effectiveEnd = endM > 0 ? endH : endH;
      for (let h = startH; h < effectiveEnd; h++) slotsSet.add(h);
    }
  }
  const slots = [...slotsSet].sort((a, b) => a - b);
  return slots.length > 0 ? slots : FALLBACK_SLOTS;
}

function fmtDate(d: Date): string { return d.toISOString().split('T')[0]; }
function isToday(d: Date): boolean { const n = new Date(); return d.toDateString() === n.toDateString(); }
function fmtLabel(d: Date): string {
  const today = new Date(); today.setHours(0,0,0,0);
  const t = new Date(d); t.setHours(0,0,0,0);
  const diff = Math.round((t.getTime() - today.getTime()) / 86400000);
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
  const [venueHours, setVenueHours] = useState<string | null>(null);
  const [loadingVenue, setLoadingVenue] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'review' | 'payment'>('review');

  const dates = useMemo(() => Array.from({length:5},(_,i) => {const d = new Date(); d.setDate(d.getDate()+i); return d;}), []);
  const [selectedDate, setSelectedDate] = useState(dates[0]);

  const availableSlots = useMemo(() => {
    const all = parseTimeSlots(venueHours, selectedDate);
    const now = new Date();
    return all.filter(h => {
      if (isToday(selectedDate)) return h > now.getHours();
      return h + duration <= Math.max(...all, 24);
    });
  }, [venueHours, selectedDate, duration]);

  const [startHour, setStartHour] = useState(availableSlots[0] ?? FALLBACK_SLOTS[0]);

  useEffect(() => {
    setStartHour(availableSlots[0] ?? FALLBACK_SLOTS[0]);
  }, [availableSlots]);

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
          if (typeof data.opening_hours === 'string') setVenueHours(data.opening_hours);
          else if (typeof data.opening_hours_summary === 'string') setVenueHours(data.opening_hours_summary);
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
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleBooking() {
    setProcessing(true);
    try {
      const res = await createBooking({
        user_id: user?.user_id ?? user?.id ?? 1,
        venue_id: venueId, booking_date: fmtDate(selectedDate),
        start_time: `${String(startHour).padStart(2,'0')}:00:00`,
        end_time: `${String(endHour).padStart(2,'0')}:00:00`,
        seats_reserved: 1,
      }, token ?? undefined);
      setResult({ success: true, message: `Order #${res.order_id} confirmed!` });
    } catch (e: any) {
      setResult({ success: false, message: e.message || 'Booking failed.' });
    }
    setProcessing(false);
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable onPress={() => step === 'payment' ? setStep('review') : navigation.goBack()} hitSlop={16}>
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{step === 'review' ? 'Confirm Booking' : 'Payment'}</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
        <View style={styles.venueSection}>
          <Text style={styles.venueName}>{venueName}</Text>
          {loadingVenue ? <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" style={{marginTop:4}} /> : (
            <View style={styles.addressRow}><MapPin size={13} color="rgba(255,255,255,0.85)" /><Text style={styles.addressText}>{address}</Text></View>
          )}
        </View>

        {step === 'review' ? (<>
          <View style={styles.sectionLabel}>Date</View>
          <View style={styles.dateRow}>
            {dates.map(d => {
              const active = fmtDate(d) === fmtDate(selectedDate);
              return (
                <Pressable key={fmtDate(d)} style={[styles.dateChip, active && styles.dateChipActive]} onPress={() => setSelectedDate(d)}>
                  <Text style={[styles.dateTop, active && styles.dateTopActive]}>{isToday(d) ? 'Today' : isToday(new Date(d.getTime()-86400000)) ? 'Tomorrow' : d.toLocaleDateString('en-US',{weekday:'short'})}</Text>
                  <Text style={[styles.dateBottom, active && styles.dateBottomActive]}>{d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.sectionLabel}>Start Time</View>
          <View style={styles.timeRow}>
            {availableSlots.map(h => (
              <Pressable key={h} style={[styles.timeChip, startHour===h && styles.timeChipActive]} onPress={() => setStartHour(h)}>
                <Text style={[styles.timeChipText, startHour===h && styles.timeChipTextActive]}>{fmtTime(h)}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.sectionLabel}>Duration</View>
          <View style={styles.durationRow}>
            {DURATIONS.map(h => (
              <Pressable key={h} style={[styles.durationBtn, duration===h && styles.durationBtnActive]} onPress={() => selectDuration(h)}>
                <Text style={[styles.durationText, duration===h && styles.durationTextActive]}>{h}h</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.timeCard}>
            <Clock size={15} color={colors.textMuted} />
            <Text style={styles.timeCardText}>{fmtLabel(selectedDate)} · {fmtTime(startHour)} – {fmtTime(endHour)}</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>${(price/duration).toFixed(0)}/hr × {duration}h</Text><Text style={styles.summaryValue}>${price}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Service fee</Text><Text style={styles.summaryValue}>${SERVICE_FEE}</Text></View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>${price+SERVICE_FEE}</Text></View>
          </View>
        </>) : (<>
          <View style={styles.paymentCard}>
            <CreditCard size={20} color={colors.primary} />
            <Text style={styles.paymentTitle}>Simulated Payment</Text>
            <Text style={styles.paymentDesc}>This is a demo payment. In production, Stripe or other gateway would process your card here.</Text>
            <View style={styles.paymentDivider} />
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Total charge</Text><Text style={styles.totalValue}>${price+SERVICE_FEE}</Text></View>
          </View>
        </>)}

        <PrimaryButton
          label={step === 'review' ? 'Proceed to Payment' : processing ? 'Confirming...' : 'Confirm & Pay'}
          disabled={processing}
          onPress={() => step === 'review' ? setStep('payment') : handleBooking()}
        />
        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <Modal visible={!!result} transparent animationType="fade">
        <View style={styles.resultOverlay}>
          <View style={styles.resultCard}>
            {result?.success ? <CheckCircle size={48} color={colors.primary} /> : <XCircle size={48} color={colors.danger} />}
            <Text style={[styles.resultTitle, { color: result?.success ? colors.primary : colors.danger }]}>{result?.success ? 'Booking Confirmed!' : 'Booking Failed'}</Text>
            <Text style={styles.resultMessage}>{result?.message}</Text>
            {result?.success ? (
              <PrimaryButton label="View My Bookings" onPress={() => { setResult(null); navigation.navigate('MainTabs', { screen: 'Account' }); }} />
            ) : (
              <PrimaryButton label="Try Again" variant="outline" onPress={() => setResult(null)} />
            )}
            <Pressable style={styles.resultClose} onPress={() => { setResult(null); if (result?.success) navigation.navigate('MainTabs', { screen: 'Account' }); }}>
              <Text style={styles.resultCloseText}>{result?.success ? 'Go to Account' : 'Close'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  dateRow: { flexDirection: 'row', gap: spacing.sm },
  dateChip: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: spacing.sm, backgroundColor: colors.white },
  dateChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  dateTop: { fontSize: 11, color: colors.textMuted },
  dateTopActive: { color: 'rgba(255,255,255,0.8)' },
  dateBottom: { fontSize: 14, fontWeight: '600', color: colors.text },
  dateBottomActive: { color: colors.white },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  timeChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.white },
  timeChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  timeChipText: { fontSize: 13, fontWeight: '500', color: colors.text },
  timeChipTextActive: { color: colors.white, fontWeight: '600' },
  durationRow: { flexDirection: 'row', gap: spacing.sm },
  durationBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: spacing.md, alignItems: 'center', backgroundColor: colors.white },
  durationBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  durationText: { fontSize: 16, fontWeight: '600', color: colors.text },
  durationTextActive: { color: colors.white },
  timeCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderRadius: 10 },
  timeCardText: { fontSize: 14, color: colors.textMuted },
  summaryCard: { backgroundColor: colors.white, borderRadius: 14, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14, color: colors.textMuted },
  summaryValue: { fontSize: 14, fontWeight: '500', color: colors.text },
  summaryDivider: { height: 1, backgroundColor: colors.border },
  totalLabel: { fontSize: 18, fontWeight: '700', color: colors.text },
  totalValue: { fontSize: 20, fontWeight: '700', color: colors.primary },
  paymentCard: { backgroundColor: colors.white, borderRadius: 14, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: spacing.sm },
  paymentTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  paymentDesc: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  paymentDivider: { height: 1, backgroundColor: colors.border, width: '100%', marginVertical: spacing.xs },
  resultOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  resultCard: { width: '85%', backgroundColor: colors.white, borderRadius: 20, padding: spacing.xl, alignItems: 'center', gap: spacing.md },
  resultTitle: { fontSize: 20, fontWeight: '700' },
  resultMessage: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  resultClose: { paddingTop: spacing.sm },
  resultCloseText: { fontSize: 14, color: colors.textMuted },
});

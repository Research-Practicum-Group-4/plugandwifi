import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Clock, MapPin, Calendar, CheckCircle, XCircle, CreditCard } from 'lucide-react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { fetchVenueById, fetchVenueAvailability, type VenueAvailabilityResponse } from '../../services/venues';
import { createBooking, confirmMockPayment, cancelBooking } from '../../services/bookings';
import { useT } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../theme/spacing';
import { canBookContinuousHours, openingWindowsForDate } from '../../utils/openingHours';
import { localizedApiError } from '../../utils/apiError';
import type { RootStackScreenProps } from '../../types/navigation';

const SERVICE_FEE = 2;
const VENUE_TIME_ZONE = 'America/New_York';
const DURATIONS = [1, 2, 3, 4] as const;

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function getVenueNow(): { date: Date; hour: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: VENUE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value);
  return {
    date: new Date(value('year'), value('month') - 1, value('day'), 12),
    hour: value('hour'),
  };
}
function isSameDate(a: Date, b: Date): boolean { return fmtDate(a) === fmtDate(b); }
function fmtLabel(d: Date, today: Date, t: (k: string) => string): string {
  const base = new Date(today); base.setHours(0,0,0,0);
  const dd = new Date(d); dd.setHours(0,0,0,0);
  const diff = Math.round((dd.getTime() - base.getTime()) / 86400000);
  if (diff === 0) return t('common.today');
  if (diff === 1) return t('common.tomorrow');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtTime(h: number): string {
  const hh = h % 24;
  const s = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh > 12 ? hh - 12 : (hh === 0 ? 12 : hh);
  return `${h12}:00 ${s}`;
}

// "4242424242424242" -> "4242 4242 4242 4242"
function formatCardNumber(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 16);
  return d.replace(/(.{4})/g, '$1 ').trim();
}
// "1226" -> "12/26"
function formatExpiry(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`;
}
function fmtMoney(value: number): string {
  return value.toFixed(2).replace(/\.00$/, '');
}

export function CheckoutScreen({ navigation, route }: RootStackScreenProps<'Checkout'>) {
  const { venueId, venueName, price: rawPrice } = route.params;
  const { user, token } = useAuth();
  const { colors: tc } = useTheme();
  const { t } = useT();
  const safePrice = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : 10;
  const [duration, setDuration] = useState<number>(1);
  const price = safePrice * duration;
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'review' | 'payment'>('review');
  const [availability, setAvailability] = useState<VenueAvailabilityResponse | null>(null);
  const [venueHours, setVenueHours] = useState<string | null>(null);
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; title: string; msg: string } | null>(null);

  const [venueNow, setVenueNow] = useState(getVenueNow);
  useEffect(() => {
    const interval = setInterval(() => setVenueNow(getVenueNow()), 60_000);
    return () => clearInterval(interval);
  }, []);
  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(venueNow.date); d.setDate(d.getDate() + i); return d;
  }), [venueNow]);
  const [selDate, setSelDate] = useState(dates[0]);

  useEffect(() => {
    if (fmtDate(selDate) < fmtDate(venueNow.date)) {
      setSelDate(dates[0]);
    }
  }, [dates, selDate, venueNow]);

  const slots = useMemo(() => {
    if (!availability?.available_slots) return [];
    const dateStr = fmtDate(selDate);
    const openingWindows = openingWindowsForDate(venueHours, selDate);
    const availableHours = new Set<number>();
    for (const s of availability.available_slots) {
      if (s.date !== dateStr || !s.available) continue;
      const sh = parseInt(s.start_time.includes('T') ? s.start_time.split('T')[1] : s.start_time, 10);
      const eh = parseInt(s.end_time.includes('T') ? s.end_time.split('T')[1] : s.end_time, 10);
      for (let h = sh; h < eh; h++) {
        availableHours.add(h);
      }
    }
    return [...availableHours].filter(h => {
      const isFuture = !isSameDate(selDate, venueNow.date) || h > venueNow.hour;
      return canBookContinuousHours(h, duration, availableHours, openingWindows) && isFuture;
    }).sort((a, b) => a - b);
  }, [availability, duration, selDate, venueHours, venueNow]);

  const [startH, setStartH] = useState(-1);

  useEffect(() => {
    if (slots.length === 0) setStartH(-1);
    else if (!slots.includes(startH)) setStartH(slots[0]);
  }, [slots, startH]);

  const loadBookingDetails = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    (async () => {
      try {
        const [data, avail] = await Promise.all([fetchVenueById(venueId), fetchVenueAvailability(venueId)]);
        if (data) {
          const p: string[] = [];
          if (data.building_number) p.push(data.building_number);
          if (data.street) p.push(data.street);
          if (data.borough) p.push(data.borough);
          if (p.length > 0) setAddress(p.join(', '));
          if (typeof data.opening_hours === 'string') setVenueHours(data.opening_hours);
          else if (typeof data.opening_hours_summary === 'string') setVenueHours(data.opening_hours_summary);
        }
        setAvailability(avail);
      } catch {
        setAvailability(null);
        setLoadError(true);
      }
      setLoading(false);
    })();
  }, [venueId]);

  useEffect(() => { loadBookingDetails(); }, [loadBookingDetails, loadAttempt]);

  const endH = startH + duration;
  const canProceed = !loading && !loadError && (step === 'payment' || startH >= 0);

  const [pendingBookingId, setPendingBookingId] = useState<number | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardError, setCardError] = useState<string | null>(null);

  // Cancel the unpaid pending booking when leaving the screen
  // (covers Android back button and iOS swipe-back, not just the header button)
  useEffect(() => {
    return navigation.addListener('beforeRemove', () => {
      if (pendingBookingId && !result?.ok) {
        cancelBooking(pendingBookingId, token ?? undefined).catch(() => {});
      }
    });
  }, [navigation, pendingBookingId, result, token]);

  async function createPendingBooking() {
    if (!user) {
      setResult({ ok: false, title: t('checkout.bookingFailed'), msg: t('checkout.signInToBook') });
      return;
    }
    setProcessing(true);
    try {
      // Backend creates the booking as pending_payment; it is only
      // confirmed after the mock payment endpoint approves the card.
      const res = await createBooking({
        venue_id: venueId, booking_date: fmtDate(selDate),
        start_time: `${String(startH).padStart(2, '0')}:00:00`,
        end_time: `${String(endH).padStart(2, '0')}:00:00`,
        seats_reserved: 1,
      }, token ?? undefined);
      setPendingBookingId(res.id);
      setStep('payment');
    } catch (error) {
      setResult({
        ok: false,
        title: t('checkout.bookingFailed'),
        msg: localizedApiError(error, t, 'checkout.bookingFailedMsg', {
          conflict: 'checkout.slotUnavailable',
          validation: 'checkout.slotUnavailable',
        }),
      });
    }
    setProcessing(false);
  }

  function validateCard(): string | null {
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length !== 16) return t('checkout.invalidCard');
    const m = cardExpiry.match(/^(\d{2})\/(\d{2})$/);
    if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) return t('checkout.invalidExpiry');
    const now = new Date();
    const expiryMonth = Number(m[1]);
    const expiryYear = 2000 + Number(m[2]);
    if (expiryYear < now.getFullYear() || (expiryYear === now.getFullYear() && expiryMonth < now.getMonth() + 1)) {
      return t('checkout.invalidExpiry');
    }
    if (!/^\d{3,4}$/.test(cardCvv)) return t('checkout.invalidCvv');
    return null;
  }

  async function doPayment() {
    if (!pendingBookingId) return;
    const err = validateCard();
    if (err) { setCardError(err); return; }
    setCardError(null);
    setProcessing(true);
    try {
      const res = await confirmMockPayment(pendingBookingId, cardNumber.replace(/\D/g, ''), token ?? undefined);
      // 4000 0000 0000 0002 returns HTTP 200 with payment_status "failed",
      // so success must be decided by the payload, not by the lack of an error.
      if (res.payment_status === 'paid' || res.status === 'confirmed') {
        setResult({ ok: true, title: t('checkout.bookingConfirmed'), msg: `${venueName} · Order #${res.order_id}` });
      } else {
        setResult({ ok: false, title: t('checkout.paymentFailed'), msg: t('checkout.paymentFailedMsg') });
      }
    } catch {
      // Backend rejects any non-test card with an English hint message that
      // must not be shown to users — always show the localized declined text.
      setResult({ ok: false, title: t('checkout.paymentFailed'), msg: t('checkout.paymentFailedMsg') });
    }
    setProcessing(false);
  }

  return (
    <View style={[S.root, { backgroundColor: tc.background }]}>
      <SafeAreaView edges={['top']} style={[S.headerSafe, { backgroundColor: tc.white, borderBottomColor: tc.border }]}>
        <View style={S.header}>
          <Pressable onPress={() => { if (step === 'payment') { if (pendingBookingId) { cancelBooking(pendingBookingId, token ?? undefined).catch(() => {}); } setStep('review'); setPendingBookingId(null); setCardError(null); } else { navigation.goBack(); } }} hitSlop={16}>
            <ChevronLeft size={24} color={tc.text} />
          </Pressable>
          <Text style={[S.headerTitle, { color: tc.text }]}>{step === 'review' ? t('checkout.confirmBooking') : t('checkout.payment')}</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>

      <ScrollView style={S.body} contentContainerStyle={S.bodyContent} showsVerticalScrollIndicator={false}>
        <View style={[S.venueCard, { backgroundColor: tc.primary }]}>
          <Text style={S.venueName}>{venueName}</Text>
          {loading ? <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" style={{ marginTop: 4 }} /> : address ? (
            <View style={S.addrRow}><MapPin size={13} color="rgba(255,255,255,0.85)" /><Text style={S.addrText}>{address}</Text></View>
          ) : null}
        </View>

        {!loading && loadError ? (
          <View style={[S.loadErrorCard, { backgroundColor: tc.white, borderColor: tc.border }]}>
            <Text style={[S.loadErrorText, { color: tc.textMuted }]}>{t('common.error')}</Text>
            <PrimaryButton label={t('checkout.tryAgain')} onPress={() => setLoadAttempt(attempt => attempt + 1)} />
          </View>
        ) : null}

        {step === 'review' ? (
          <>
            <Text style={[S.label, { color: tc.textMuted }]}>{t('checkout.date')}</Text>
            <Pressable style={[S.picker, { backgroundColor: tc.white, borderColor: tc.border }]} onPress={() => setShowDate(true)}>
              <Calendar size={18} color={tc.primary} />
              <Text style={[S.pickerText, { color: tc.text }]}>{fmtLabel(selDate, venueNow.date, t)}</Text>
              <Text style={[S.arrow, { color: tc.textMuted }]}>▼</Text>
            </Pressable>

            <Text style={[S.label, { color: tc.textMuted }]}>{t('checkout.startTime')}</Text>
            {slots.length === 0 ? (
              <Text style={[S.noSlots, { color: tc.textMuted }]}>{t('checkout.noSlots')}</Text>
            ) : (
              <Pressable style={[S.picker, { backgroundColor: tc.white, borderColor: tc.border }]} onPress={() => setShowTime(true)}>
                <Clock size={18} color={tc.primary} />
                <Text style={[S.pickerText, { color: tc.text }]}>{startH >= 0 ? fmtTime(startH) : t('checkout.selectTime')}</Text>
                <Text style={[S.arrow, { color: tc.textMuted }]}>▼</Text>
              </Pressable>
            )}

            <Text style={[S.label, { color: tc.textMuted }]}>{t('checkout.duration')}</Text>
            <View style={S.durationRow}>
              {DURATIONS.map(hours => {
                const selected = duration === hours;
                return (
                  <Pressable
                    key={hours}
                    style={[S.durationChip, { borderColor: selected ? tc.primary : tc.border, backgroundColor: selected ? tc.primary : tc.white }]}
                    onPress={() => setDuration(hours)}
                  >
                    <Text style={[S.durationChipText, { color: selected ? '#fff' : tc.text }]}>{hours}h</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[S.durationNote, { color: tc.textMuted }]}>{t('checkout.multiHourNote')}</Text>

            <View style={[S.timeInfo, { backgroundColor: tc.surface }]}>
              <Clock size={15} color={tc.textMuted} />
              <Text style={[S.timeInfoText, { color: tc.textMuted }]}>
                {startH >= 0 ? `${fmtLabel(selDate, venueNow.date, t)} · ${fmtTime(startH)} – ${fmtTime(endH)}` : t('checkout.selectSlot')}
              </Text>
            </View>

            {venueHours ? (
              <View style={[S.hoursInfo, { backgroundColor: tc.primary + '15', borderColor: tc.primary + '55' }]}>
                <Text style={[S.hoursInfoText, { color: tc.text }]}>🕐 {t('checkout.openHours')}: {venueHours}</Text>
              </View>
            ) : null}

            <View style={[S.summary, { backgroundColor: tc.white, borderColor: tc.border }]}>
              <View style={S.sumRow}><Text style={[S.sumL, { color: tc.textMuted }]}>${fmtMoney(safePrice)}/hr × {duration}h</Text><Text style={[S.sumV, { color: tc.text }]}>${fmtMoney(price)}</Text></View>
              <View style={S.sumRow}><Text style={[S.sumL, { color: tc.textMuted }]}>{t('checkout.serviceFee')}</Text><Text style={[S.sumV, { color: tc.text }]}>${SERVICE_FEE}</Text></View>
              <View style={[S.sumDiv, { backgroundColor: tc.border }]} />
              <View style={S.sumRow}><Text style={[S.totL, { color: tc.text }]}>{t('checkout.total')}</Text><Text style={[S.totV, { color: tc.primary }]}>${fmtMoney(price + SERVICE_FEE)}</Text></View>
            </View>
          </>
        ) : (
          <View style={[S.payCard, { backgroundColor: tc.white, borderColor: tc.border }]}>
            <View style={[S.payBookingSummary, { backgroundColor: tc.surface }]}>
              <Calendar size={16} color={tc.primary} />
              <Text style={[S.payBookingSummaryText, { color: tc.text }]}>
                {fmtLabel(selDate, venueNow.date, t)} · {fmtTime(startH)}–{fmtTime(endH)} · {duration}h
              </Text>
            </View>
            <View style={S.payHeader}>
              <CreditCard size={20} color={tc.primary} />
              <Text style={[S.payTitle, { color: tc.text }]}>{t('checkout.cardDetails')}</Text>
            </View>
            <TextInput
              style={[S.cardInput, { borderColor: tc.border, color: tc.text, backgroundColor: tc.surface }]}
              placeholder={t('checkout.cardNumber')}
              placeholderTextColor={tc.textMuted}
              value={cardNumber}
              onChangeText={v => { setCardNumber(formatCardNumber(v)); setCardError(null); }}
              keyboardType="number-pad"
              maxLength={19}
            />
            <View style={S.cardRow}>
              <TextInput
                style={[S.cardInput, S.cardHalf, { borderColor: tc.border, color: tc.text, backgroundColor: tc.surface }]}
                placeholder="MM/YY"
                placeholderTextColor={tc.textMuted}
                value={cardExpiry}
                onChangeText={v => { setCardExpiry(formatExpiry(v)); setCardError(null); }}
                keyboardType="number-pad"
                maxLength={5}
              />
              <TextInput
                style={[S.cardInput, S.cardHalf, { borderColor: tc.border, color: tc.text, backgroundColor: tc.surface }]}
                placeholder="CVV"
                placeholderTextColor={tc.textMuted}
                value={cardCvv}
                onChangeText={v => { setCardCvv(v.replace(/\D/g, '').slice(0, 4)); setCardError(null); }}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
              />
            </View>
            {cardError ? <Text style={[S.cardError, { color: tc.danger }]}>{cardError}</Text> : null}
            <View style={[S.sumDiv, { backgroundColor: tc.border, alignSelf: 'stretch' }]} />
            <View style={[S.sumRow, { alignSelf: 'stretch' }]}><Text style={[S.sumL, { color: tc.textMuted }]}>{t('checkout.totalCharge')}</Text><Text style={[S.totV, { color: tc.primary }]}>${fmtMoney(price + SERVICE_FEE)}</Text></View>
          </View>
        )}

        <View style={[S.policyCard, { backgroundColor: tc.surface, borderColor: tc.border }]}>
          <Text style={[S.policyIcon, { color: tc.primary }]}>ⓘ</Text>
          <Text style={[S.policyText, { color: tc.textMuted }]}>{t('checkout.cancellationPolicy')}</Text>
        </View>

        <PrimaryButton
          label={step === 'review' ? (processing ? t('checkout.confirming') : t('checkout.proceedToPayment')) : t('checkout.confirmAndPay')}
          disabled={processing || !canProceed || (step === 'payment' && (!cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim()))}
          onPress={() => step === 'review' ? createPendingBooking() : doPayment()}
        />
        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Processing payment overlay */}
      <Modal visible={processing && step === 'payment'} transparent animationType="fade">
        <View style={S.modalOver}>
          <View style={[S.processCard, { backgroundColor: tc.white }]}>
            <ActivityIndicator size="large" color={tc.primary} />
            <Text style={[S.processText, { color: tc.text }]}>{t('checkout.processingPayment')}</Text>
          </View>
        </View>
      </Modal>

      {/* Result Modal */}
      <Modal visible={!!result} transparent animationType="fade">
        <View style={S.modalOver}>
          <View style={[S.modalCard, { backgroundColor: tc.white }]}>
            {result?.ok ? <CheckCircle size={48} color={tc.primary} /> : <XCircle size={48} color={tc.danger} />}
            <Text style={[S.modalTitle, { color: result?.ok ? tc.primary : tc.danger }]}>{result?.title}</Text>
            <Text style={[S.modalMsg, { color: tc.textMuted }]}>{result?.msg}</Text>
            {result?.ok ? (
              <PrimaryButton label={t('checkout.viewMyBookings')} onPress={() => { setResult(null); navigation.navigate('MainTabs', { screen: 'Account' }); }} />
            ) : (
              <PrimaryButton label={t('checkout.tryAgain')} variant="outline" onPress={() => setResult(null)} />
            )}
            <Pressable onPress={() => { setResult(null); if (result?.ok) navigation.navigate('MainTabs', { screen: 'Account' }); }}>
              <Text style={[S.modalClose, { color: tc.textMuted }]}>{result?.ok ? t('checkout.goToAccount') : t('common.close')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      <Modal visible={showDate} transparent animationType="slide">
        <Pressable style={S.drawerOver} onPress={() => setShowDate(false)}>
          <View style={[S.drawer, { backgroundColor: tc.white }]} onStartShouldSetResponder={() => true}>
            <View style={[S.drawerHandle, { backgroundColor: tc.border }]} />
            <Text style={[S.drawerTitle, { color: tc.text }]}>{t('checkout.selectDate')}</Text>
            {dates.map(d => {
              const isSel = fmtDate(d) === fmtDate(selDate);
              return (
                <Pressable key={fmtDate(d)} style={[S.drawerItem, { borderBottomColor: tc.border }, isSel && { backgroundColor: tc.surface }]} onPress={() => { setSelDate(d); setShowDate(false); }}>
                  <Text style={[S.drawerItemText, { color: isSel ? tc.primary : tc.text }, isSel && S.drawerItemTextOn]}>{fmtLabel(d, venueNow.date, t)}</Text>
                  {isSel ? <Text style={{ color: tc.primary }}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* Time Picker */}
      <Modal visible={showTime} transparent animationType="slide">
        <Pressable style={S.drawerOver} onPress={() => setShowTime(false)}>
          <View style={[S.drawer, { backgroundColor: tc.white }]} onStartShouldSetResponder={() => true}>
            <View style={[S.drawerHandle, { backgroundColor: tc.border }]} />
            <Text style={[S.drawerTitle, { color: tc.text }]}>{t('checkout.selectStartTime')}</Text>
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {slots.map(h => {
                const isSel = h === startH;
                return (
                  <Pressable key={h} style={[S.drawerItem, { borderBottomColor: tc.border }, isSel && { backgroundColor: tc.surface }]} onPress={() => { setStartH(h); setShowTime(false); }}>
                    <Text style={[S.drawerItemText, { color: isSel ? tc.primary : tc.text }, isSel && S.drawerItemTextOn]}>{fmtTime(h)}</Text>
                    {isSel ? <Text style={{ color: tc.primary }}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },
  headerSafe: { borderBottomWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  body: { flex: 1 },
  bodyContent: { padding: spacing.lg, gap: spacing.md },
  venueCard: { borderRadius: 16, padding: spacing.lg },
  loadErrorCard: { borderWidth: 1, borderRadius: 12, padding: spacing.md, gap: spacing.sm },
  loadErrorText: { textAlign: 'center' },
  venueName: { fontSize: 20, fontWeight: '700', color: '#fff' },
  addrRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  addrText: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  picker: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  pickerText: { flex: 1, fontSize: 15, fontWeight: '500' },
  arrow: { fontSize: 10 },
  noSlots: { fontSize: 14, fontStyle: 'italic', padding: spacing.md },
  durationRow: { flexDirection: 'row', gap: spacing.sm },
  durationChip: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  durationChipText: { fontSize: 15, fontWeight: '700' },
  durationNote: { fontSize: 12, lineHeight: 18 },
  timeInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: 10 },
  timeInfoText: { fontSize: 14 },
  hoursInfo: { padding: spacing.md, borderRadius: 12, borderWidth: 1 },
  hoursInfoText: { fontSize: 13 },
  summary: { borderRadius: 14, padding: spacing.lg, borderWidth: 1, gap: spacing.sm },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sumL: { fontSize: 14 },
  sumV: { fontSize: 14, fontWeight: '500' },
  sumDiv: { height: 1 },
  totL: { fontSize: 18, fontWeight: '700' },
  totV: { fontSize: 20, fontWeight: '700' },
  payCard: { borderRadius: 14, padding: spacing.lg, borderWidth: 1, gap: spacing.sm },
  payHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  payBookingSummary: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: 10, padding: spacing.md, marginBottom: spacing.xs },
  payBookingSummaryText: { flex: 1, fontSize: 13, fontWeight: '600' },
  payTitle: { fontSize: 16, fontWeight: '600' },
  cardInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15 },
  cardRow: { flexDirection: 'row', gap: spacing.sm },
  cardHalf: { flex: 1 },
  cardError: { fontSize: 12, fontWeight: '500' },
  policyCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderWidth: 1, borderRadius: 12, padding: spacing.md },
  policyIcon: { fontSize: 17, fontWeight: '700' },
  policyText: { flex: 1, fontSize: 12, lineHeight: 18 },
  processCard: { borderRadius: 20, paddingHorizontal: spacing.xl, paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.md, minWidth: 220 },
  processText: { fontSize: 15, fontWeight: '600' },
  modalOver: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '85%', borderRadius: 20, padding: spacing.xl, alignItems: 'center', gap: spacing.md },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalMsg: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  modalClose: { fontSize: 14, paddingTop: spacing.sm },
  drawerOver: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  drawer: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, paddingBottom: spacing.xl },
  drawerHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  drawerTitle: { fontSize: 17, fontWeight: '700', marginBottom: spacing.md },
  drawerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  drawerItemText: { fontSize: 15 },
  drawerItemTextOn: { fontWeight: '600' },
});

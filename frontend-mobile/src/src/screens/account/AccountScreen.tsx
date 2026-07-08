import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Settings, ArrowRight, Building, MapPin, Clock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { fetchUserBookings, cancelBooking, type UserBookingsResponse, type UserBookingItem } from '../../services/bookings';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../context/LanguageContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { MainTabScreenProps } from '../../types/navigation';

function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function fmtTime(t: string) {
  const [h, m] = t.split(':'); const hour = parseInt(h);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
  return `${h12}:${m} ${suffix}`;
}

export function AccountScreen({ navigation }: MainTabScreenProps<'Account'>) {
  const { t } = useT();
  const { user, isAuthenticated, logout, token } = useAuth();
  const [bookings, setBookings] = useState<UserBookingsResponse | null>(null);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [tab, setTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [cancelId, setCancelId] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) return;
      (async () => { setLoadingBookings(true); try { const data = await fetchUserBookings(token ?? undefined); setBookings(data); } catch {} setLoadingBookings(false); })();
    }, [isAuthenticated, token]),
  );

  async function handleLogout() { await logout(); }

  async function confirmCancel() {
    if (!cancelId) return;
    try { await cancelBooking(cancelId, token ?? undefined); const data = await fetchUserBookings(token ?? undefined); setBookings(data); } catch (e: any) { Alert.alert('Error', e.message || 'Failed'); }
    setCancelId(null);
  }

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={{flex:1}}>
          <View style={styles.header}><View/><Pressable style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')} hitSlop={16}><Settings size={24} color={colors.textMuted}/></Pressable></View>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            <View style={styles.greeting}><Text style={styles.greetingTitle}>Find Your Workspace</Text><Text style={styles.greetingSubtitle}>Sign in to book workspaces, save your favorites, and manage your reservations.</Text></View>
            <PrimaryButton label="Sign In" onPress={() => navigation.navigate('Login')} />
            <View style={styles.signupRow}><Text style={styles.signupText}>Don't have an account?</Text><Pressable onPress={() => navigation.navigate('Signup')}><Text style={styles.signupLink}>Sign up</Text></Pressable></View>
            <View style={styles.providerCard}><Building size={20} color={colors.primary} /><View style={styles.providerInfo}><Text style={styles.providerTitle}>Offer your space?</Text><Text style={styles.providerDesc}>List your venue and start hosting workspace seekers.</Text></View><Pressable onPress={() => Linking.openURL('https://plugandwifi.xyz/provider/offer-space')}><ArrowRight size={18} color={colors.primary}/></Pressable></View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  const list = tab === 'upcoming' ? (bookings?.upcoming ?? []) : (bookings?.completed ?? []);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{flex:1}}>
        <View style={styles.header}><View/><Pressable style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')} hitSlop={16}><Settings size={24} color={colors.textMuted}/></Pressable></View>
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{user.full_name.charAt(0).toUpperCase()}</Text></View>
          <Text style={styles.userName}>{user.full_name}</Text>

          <View style={styles.tabs}>
            <Pressable style={[styles.tabBtn, tab==='upcoming' && styles.tabBtnActive]} onPress={() => setTab('upcoming')}><Text style={[styles.tabText, tab==='upcoming' && styles.tabTextActive]}>Upcoming</Text></Pressable>
            <Pressable style={[styles.tabBtn, tab==='completed' && styles.tabBtnActive]} onPress={() => setTab('completed')}><Text style={[styles.tabText, tab==='completed' && styles.tabTextActive]}>Completed</Text></Pressable>
          </View>

          {loadingBookings ? (<ActivityIndicator size="large" color={colors.primary} style={{marginTop:spacing.xl}}/>) : list.length === 0 ? (
            <View style={styles.emptyBookings}><Text style={styles.emptyBookingsIcon}>📋</Text><Text style={styles.emptyBookingsTitle}>No {tab} bookings</Text><Text style={styles.emptyBookingsDesc}>Find a workspace and book your first session</Text><PrimaryButton label="Browse Workspaces" onPress={() => navigation.navigate('Home')}/></View>
          ) : (
            list.map(b => (
              <Pressable key={b.booking_id} style={styles.bookingCard} onPress={() => navigation.navigate('VenueDetail', { venueId: b.venue_id })}>
                <View style={styles.bookingHeader}>
                  <Text style={styles.bookingVenue}>{b.venue_name || 'Workspace'}</Text>
                  <View style={[styles.statusBadge, tab==='upcoming'?styles.statusUpcoming:styles.statusCompleted]}><Text style={styles.statusText}>{tab==='upcoming'?'Upcoming':'Completed'}</Text></View>
                </View>
                <View style={styles.bookingRow}><Clock size={13} color={colors.textMuted}/><Text style={styles.bookingMeta}>{fmtDate(b.booking_date)} · {fmtTime(b.start_time)} – {fmtTime(b.end_time)}</Text></View>
                <View style={styles.bookingRow}><MapPin size={13} color={colors.textMuted}/><Text style={styles.bookingMeta}>{b.seats_reserved} seat{b.seats_reserved!==1?'s':''}</Text></View>
                <View style={styles.bookingFooter}>
                  <Text style={styles.orderLabel}>{b.order_id?.slice(-8)}</Text>
                  {tab==='upcoming' ? (<Pressable style={styles.cancelBtn} onPress={() => setCancelId(b.booking_id)}><Text style={styles.cancelBtnText}>Cancel</Text></Pressable>) : null}
                </View>
              </Pressable>
            ))
          )}

          <PrimaryButton label="Sign Out" variant="outline" onPress={handleLogout}/>
          <View style={{height:spacing.xl}}/>
        </ScrollView>
      </SafeAreaView>

      <Modal visible={!!cancelId} transparent animationType="fade">
        <View style={styles.cancelOverlay}><View style={styles.cancelCard}><Text style={styles.cancelTitle}>Cancel Booking?</Text><Text style={styles.cancelMessage}>This cannot be undone. The time slot will be released for others.</Text><PrimaryButton label="Yes, Cancel" onPress={confirmCancel}/><Pressable style={{paddingTop:spacing.sm}} onPress={() => setCancelId(null)}><Text style={{fontSize:14,color:colors.textMuted}}>Keep Booking</Text></Pressable></View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  settingsBtn: { padding: 4 },
  body: { flex: 1 },
  bodyContent: { padding: spacing.lg, gap: spacing.md },
  greeting: { alignItems: 'center', marginBottom: spacing.md },
  greetingTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  greetingSubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22, marginTop: spacing.sm },
  signupRow: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  signupText: { fontSize: 14, color: colors.textMuted },
  signupLink: { fontSize: 14, fontWeight: '600', color: colors.primary },
  providerCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.white, borderRadius: 14, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  providerInfo: { flex: 1 },
  providerTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  providerDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 18, marginTop: 2 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  avatarText: { color: colors.white, fontSize: 28, fontWeight: '700' },
  userName: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: spacing.md },
  tabs: { flexDirection: 'row', gap: spacing.sm },
  tabBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: 8, backgroundColor: colors.surface },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.white },
  emptyBookings: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm, backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  emptyBookingsIcon: { fontSize: 32 },
  emptyBookingsTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  emptyBookingsDesc: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  bookingCard: { backgroundColor: colors.white, borderRadius: 12, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.xs },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingVenue: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusUpcoming: { backgroundColor: '#f0faf5' },
  statusCompleted: { backgroundColor: colors.surface },
  statusText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  bookingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bookingMeta: { fontSize: 13, color: colors.textMuted },
  bookingFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  orderLabel: { fontSize: 11, color: colors.textMuted },
  cancelBtn: { borderWidth: 1, borderColor: colors.danger, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  cancelBtnText: { fontSize: 12, color: colors.danger, fontWeight: '600' },
  cancelOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  cancelCard: { width: '85%', backgroundColor: colors.white, borderRadius: 20, padding: spacing.xl, alignItems: 'center', gap: spacing.md },
  cancelTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  cancelMessage: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
});

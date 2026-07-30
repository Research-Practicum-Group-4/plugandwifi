import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Settings, ArrowRight, Building, MapPin, Clock, Star } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { fetchUserBookings, cancelBooking, type UserBookingsResponse } from '../../services/bookings';
import { apiPost } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../theme/spacing';
import { getApiErrorDetail, localizedApiError } from '../../utils/apiError';
import type { MainTabScreenProps } from '../../types/navigation';

function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function fmtTime(t: string) {
  const [h, m] = t.split(':'); const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour)}:${m} ${suffix}`;
}

export function AccountScreen({ navigation }: MainTabScreenProps<'Account'>) {
  const { t } = useT();
  const { colors: tc } = useTheme();
  const { user, isAuthenticated, logout, token } = useAuth();
  const [bookings, setBookings] = useState<UserBookingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [rateBooking, setRateBooking] = useState<{ id: number; name: string } | null>(null);
  const [rating, setRating] = useState({ wifi: 0, plugs: 0, quiet: 0 });
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) return;
      (async () => { setLoading(true); try { const data = await fetchUserBookings(token ?? undefined); setBookings(data); } catch {} setLoading(false); })();
    }, [isAuthenticated, token]),
  );

  async function handleLogout() { await logout(); }

  async function confirmCancel() {
    if (!cancelId) return;
    try {
      await cancelBooking(cancelId, token ?? undefined);
      const data = await fetchUserBookings(token ?? undefined);
      setBookings(data);
    } catch (error) {
      const message = getApiErrorDetail(error);
      const isPolicyFailure = /24|within|before.*start|cancell?ation window/i.test(message);
      Alert.alert(
        isPolicyFailure ? t('account.cannotCancelTitle') : t('common.error'),
        isPolicyFailure
          ? t('account.cancel24hFailed')
          : localizedApiError(error, t, 'account.cancelFailed'),
      );
    }
    setCancelId(null);
  }

  async function submitRating() {
    if (!rateBooking) return;
    setSubmitting(true);
    try {
      await apiPost('/api/reviews', {
        booking_id: rateBooking.id, wifi_score: rating.wifi, plug_score: rating.plugs, quietness_score: rating.quiet,
        comment: reviewComment.trim() || null,
      }, token ?? undefined);
      const data = await fetchUserBookings(token ?? undefined);
      setBookings(data);
      setRateBooking(null);
      setRating({ wifi: 0, plugs: 0, quiet: 0 });
      setReviewComment('');
    } catch (error) {
      const message = getApiErrorDetail(error);
      const awaitingProviderConfirmation = /only completed bookings can be reviewed/i.test(message);
      Alert.alert(
        awaitingProviderConfirmation ? t('reviewStatus.pendingTitle') : t('common.error'),
        awaitingProviderConfirmation
          ? t('reviewStatus.pendingMessage')
          : localizedApiError(error, t, 'account.ratingSubmitFailed'),
      );
    }
    setSubmitting(false);
  }

  if (!isAuthenticated || !user) {
    return (
      <View style={[styles.container, { backgroundColor: tc.background }]}>
        <SafeAreaView edges={['top']} style={{flex:1}}>
          <View style={styles.header}><View/><Pressable onPress={() => navigation.navigate('Settings')} hitSlop={16}><Settings size={24} color={tc.textMuted}/></Pressable></View>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <View style={styles.greeting}><Text style={[styles.greetingTitle, { color: tc.text }]}>{t('account.findWorkspace')}</Text><Text style={[styles.greetingSubtitle, { color: tc.textMuted }]}>{t('account.signInPrompt')}</Text></View>
            <PrimaryButton label={t('account.signIn')} onPress={() => navigation.navigate('Login')} />
            <View style={styles.signupRow}><Text style={[styles.signupText, { color: tc.textMuted }]}>{t('account.noAccount')}</Text><Pressable onPress={() => navigation.navigate('Signup')}><Text style={[styles.signupLink, { color: tc.primary }]}>{t('account.signUp')}</Text></Pressable></View>
            <View style={[styles.providerCard, { backgroundColor: tc.white, borderColor: tc.border }]}><Building size={20} color={tc.primary} /><View style={styles.providerInfo}><Text style={[styles.providerTitle, { color: tc.text }]}>{t('account.offerSpace')}</Text><Text style={[styles.providerDesc, { color: tc.textMuted }]}>{t('account.offerDesc')}</Text></View><Pressable onPress={() => Linking.openURL('https://plugandwifi.xyz/provider/offer-space')}><ArrowRight size={18} color={tc.primary}/></Pressable></View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  const list = tab === 'upcoming' ? (bookings?.upcoming ?? []) : (bookings?.completed ?? []);

  return (
    <View style={[styles.container, { backgroundColor: tc.background }]}>
      <SafeAreaView edges={['top']} style={{flex:1}}>
        <View style={styles.header}><View/><Pressable onPress={() => navigation.navigate('Settings')} hitSlop={16}><Settings size={24} color={tc.textMuted}/></Pressable></View>
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <View style={[styles.avatar, { backgroundColor: tc.primary }]}><Text style={styles.avatarText}>{user.full_name.charAt(0).toUpperCase()}</Text></View>
          <Text style={[styles.userName, { color: tc.text }]}>{user.full_name}</Text>
          <View style={styles.tabs}>
            <Pressable style={[styles.tb, { backgroundColor: tab==='upcoming' ? tc.primary : tc.surface }]} onPress={()=>setTab('upcoming')}><Text style={[styles.tbTxt, { color: tab==='upcoming' ? '#fff' : tc.textMuted }]}>{t('account.upcoming')}</Text></Pressable>
            <Pressable style={[styles.tb, { backgroundColor: tab==='completed' ? tc.primary : tc.surface }]} onPress={()=>setTab('completed')}><Text style={[styles.tbTxt, { color: tab==='completed' ? '#fff' : tc.textMuted }]}>{t('account.completed')}</Text></Pressable>
          </View>
          {loading ? <ActivityIndicator size="large" color={tc.primary} style={{marginTop:spacing.xl}}/> : list.length===0 ? (
            <View style={[styles.empty, { backgroundColor: tc.white, borderColor: tc.border }]}><Text style={styles.emptyIcon}>📋</Text><Text style={[styles.emptyTitle, { color: tc.text }]}>{t('account.noBookings')} ({tab==='upcoming'?t('account.upcoming'):t('account.completed')})</Text><Text style={[styles.emptyDesc, { color: tc.textMuted }]}>{t('account.noBookingsDesc')}</Text><PrimaryButton label={t('account.browseWorkspaces')} onPress={()=>navigation.navigate('Home')}/></View>
          ) : list.map(b=>(
            <Pressable key={b.booking_id} style={[styles.card, { backgroundColor: tc.white, borderColor: tc.border }]} onPress={()=>navigation.navigate('VenueDetail',{venueId:b.venue_id})}>
              <View style={styles.cardH}><Text style={[styles.cardName, { color: tc.text }]}>{b.venue_name||t('common.workspace')}</Text><View style={[styles.status, { backgroundColor: tab==='upcoming' ? tc.primary+'20' : tc.surface }]}><Text style={[styles.statusText, { color: tc.primary }]}>{tab==='upcoming'?t('account.statusUpcoming'):t('account.statusCompleted')}</Text></View></View>
              <View style={styles.cardR}><Clock size={13} color={tc.textMuted}/><Text style={[styles.cardM, { color: tc.textMuted }]}>{fmtDate(b.booking_date)} · {fmtTime(b.start_time)} – {fmtTime(b.end_time)}</Text></View>
              <View style={styles.cardR}><MapPin size={13} color={tc.textMuted}/><Text style={[styles.cardM, { color: tc.textMuted }]}>{b.seats_reserved} {b.seats_reserved!==1?t('account.seats'):t('account.seat')}</Text></View>
              <View style={styles.cardF}><Text style={[styles.cardId, { color: tc.textMuted }]}>{b.order_id?.slice(-8)}</Text>
                {tab==='upcoming'?<Pressable style={[styles.cancelBtn, { borderColor: tc.danger }]} onPress={event=>{event.stopPropagation();setCancelId(b.booking_id);}}><Text style={[styles.cancelBtnText, { color: tc.danger }]}>{t('account.cancel')}</Text></Pressable>
                :b.review_submitted
                  ? <View style={[styles.ratedBadge, { backgroundColor: tc.primary + '18' }]}><Star size={14} color={tc.primary} fill={tc.primary}/><Text style={[styles.rateBtnText, { color: tc.primary }]}>{t('account.rated')}</Text></View>
                  : <Pressable style={[styles.rateBtn, { borderColor: tc.primary }]} onPress={event=>{event.stopPropagation();setRateBooking({id:b.booking_id,name:b.venue_name||t('common.workspace')});}}><Star size={14} color={tc.primary}/><Text style={[styles.rateBtnText, { color: tc.primary }]}>{t('checkout.rate')}</Text></Pressable>}
              </View>
            </Pressable>
          ))}
          <PrimaryButton label={t('account.signOut')} variant="outline" onPress={handleLogout}/>
          <View style={{height:spacing.xl}}/>
        </ScrollView>
      </SafeAreaView>

      <Modal visible={!!cancelId} transparent animationType="fade">
        <View style={styles.modalOver}><View style={[styles.modalCard, { backgroundColor: tc.white }]}><Text style={[styles.modalTitle, { color: tc.text }]}>{t('account.cancelBooking')}</Text><Text style={[styles.modalMsg, { color: tc.textMuted }]}>{t('account.cancelMsg')}</Text><PrimaryButton label={t('account.yesCancel')} onPress={confirmCancel}/><Pressable onPress={()=>setCancelId(null)}><Text style={[styles.modalClose, { color: tc.textMuted }]}>{t('account.keepBooking')}</Text></Pressable></View></View>
      </Modal>

      <Modal visible={!!rateBooking} transparent animationType="fade">
        <View style={styles.modalOver}>
          <View style={[styles.rateCard, { backgroundColor: tc.white }]}>
            <Text style={[styles.rateTitle, { color: tc.text }]}>{t('account.rateTitle')}</Text>
            <Text style={[styles.rateSubtitle, { color: tc.textMuted }]}>{rateBooking?.name}</Text>
            {(['wifi','plugs','quiet'] as const).map(k => (
              <View key={k} style={styles.rateRow}>
                <Text style={[styles.rateLabel, { color: tc.text }]}>{k==='wifi'?`📶 ${t('common.wifi')}`:k==='plugs'?`🔌 ${t('common.plugs')}`:`🤫 ${t('common.quiet')}`}</Text>
                <View style={styles.rateStars}>
                  {[1,2,3,4,5].map(s => (
                    <Pressable key={s} onPress={()=>setRating(r=>({...r,[k]:r[k]===s?0:s}))}>
                      <Star size={28} color={s<=rating[k]?'#f59e0b':tc.border} fill={s<=rating[k]?'#f59e0b':'transparent'}/>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
            <TextInput
              style={[styles.reviewInput, { borderColor: tc.border, backgroundColor: tc.surface, color: tc.text }]}
              placeholder={t('account.reviewPlaceholder')}
              placeholderTextColor={tc.textMuted}
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
              maxLength={1000}
            />
            <PrimaryButton label={submitting?t('account.submitting'):t('account.submitRating')} disabled={submitting||!rating.wifi||!rating.plugs||!rating.quiet} onPress={submitRating}/>
            <Pressable onPress={()=>{setRateBooking(null);setRating({wifi:0,plugs:0,quiet:0});setReviewComment('');}}><Text style={[styles.modalClose, { color: tc.textMuted }]}>{t('common.close')}</Text></Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:spacing.lg,paddingTop:spacing.sm,paddingBottom:spacing.xs},
  body:{flex:1},bodyContent:{padding:spacing.lg,gap:spacing.md},
  greeting:{alignItems:'center',marginBottom:spacing.md},
  greetingTitle:{fontSize:22,fontWeight:'700'},
  greetingSubtitle:{fontSize:14,textAlign:'center',lineHeight:22,marginTop:spacing.sm},
  signupRow:{flexDirection:'row',justifyContent:'center',gap:4},
  signupText:{fontSize:14},signupLink:{fontSize:14,fontWeight:'600'},
  providerCard:{flexDirection:'row',alignItems:'center',gap:spacing.md,borderRadius:14,padding:spacing.lg,borderWidth:1},
  providerInfo:{flex:1},providerTitle:{fontSize:15,fontWeight:'600'},providerDesc:{fontSize:13,lineHeight:18,marginTop:2},
  avatar:{width:72,height:72,borderRadius:36,alignItems:'center',justifyContent:'center',alignSelf:'center'},
  avatarText:{color:'#fff',fontSize:28,fontWeight:'700'},userName:{fontSize:20,fontWeight:'700',textAlign:'center',marginBottom:spacing.md},
  tabs:{flexDirection:'row',gap:spacing.sm},
  tb:{flex:1,paddingVertical:spacing.sm,alignItems:'center',borderRadius:8},
  tbTxt:{fontSize:14,fontWeight:'600'},
  empty:{alignItems:'center',paddingVertical:spacing.xl,gap:spacing.sm,borderRadius:14,borderWidth:1},
  emptyIcon:{fontSize:32},emptyTitle:{fontSize:16,fontWeight:'600'},emptyDesc:{fontSize:13,textAlign:'center'},
  card:{borderRadius:12,padding:spacing.md,borderWidth:1,gap:spacing.xs},
  cardH:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},cardName:{fontSize:15,fontWeight:'600',flex:1},
  status:{borderRadius:6,paddingHorizontal:8,paddingVertical:3},
  statusText:{fontSize:11,fontWeight:'600'},
  cardR:{flexDirection:'row',alignItems:'center',gap:6},cardM:{fontSize:13},
  cardF:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:spacing.xs},
  cardId:{fontSize:11},
  cancelBtn:{borderWidth:1,borderRadius:6,paddingHorizontal:10,paddingVertical:4},cancelBtnText:{fontSize:12,fontWeight:'600'},
  rateBtn:{flexDirection:'row',alignItems:'center',gap:4,borderWidth:1,borderRadius:6,paddingHorizontal:10,paddingVertical:4},rateBtnText:{fontSize:12,fontWeight:'600'},
  ratedBadge:{flexDirection:'row',alignItems:'center',gap:4,borderRadius:6,paddingHorizontal:10,paddingVertical:5},
  modalOver:{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'center',alignItems:'center'},
  modalCard:{width:'85%',borderRadius:20,padding:spacing.xl,alignItems:'center',gap:spacing.md},
  modalTitle:{fontSize:20,fontWeight:'700'},modalMsg:{fontSize:14,textAlign:'center',lineHeight:22},
  modalClose:{fontSize:14,paddingTop:spacing.sm},
  rateCard:{width:'88%',borderRadius:20,padding:spacing.xl,gap:spacing.lg},
  rateTitle:{fontSize:18,fontWeight:'700',textAlign:'center',marginBottom:4},
  rateSubtitle:{fontSize:13,textAlign:'center',marginTop:-8},
  rateRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:8},
  rateLabel:{fontSize:15,fontWeight:'500'},
  rateStars:{flexDirection:'row',gap:6},
  reviewInput:{borderWidth:1,borderRadius:12,minHeight:88,paddingHorizontal:12,paddingVertical:10,fontSize:14,textAlignVertical:'top'},
});

import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronLeft, Send, Bot, User } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sendChatMessage } from '../../services/chat';
import { mapVenue } from '../../utils/mapVenue';
import { normalizeChatQueryForApi } from '../../utils/chatQuery';
import type { Venue } from '../../types/venue';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useT } from '../../context/LanguageContext';
import { spacing } from '../../theme/spacing';
import type { RootStackScreenProps } from '../../types/navigation';

type Message = { role: 'user' | 'assistant'; text: string; time: string; venues?: Venue[] };

function now() { const d = new Date(); return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`; }

export function ChatbotScreen({ navigation }: RootStackScreenProps<'Chatbot'>) {
  const { token } = useAuth();
  const { colors: tc } = useTheme();
  const { t } = useT();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: t('chatbot.greeting'), time: now() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationContext, setConversationContext] = useState<Record<string, unknown> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const apiText = normalizeChatQueryForApi(text);
    const queryWasNormalized = apiText !== text;
    const chatHistory = messages.slice(-12).map(message => ({
      role: message.role,
      message: message.role === 'user' ? normalizeChatQueryForApi(message.text) : message.text,
    }));
    setMessages(prev => [...prev, { role: 'user', text, time: now() }]);
    setInput('');
    setLoading(true);
    try {
      const res = await sendChatMessage({
        message: apiText,
        chat_history: chatHistory,
        // A previous malformed generic "workspace" query can leave the
        // backend context pinned to a non-existent workspace category.
        conversation_context: queryWasNormalized ? null : conversationContext,
      }, token ?? undefined);
      if (res.conversation_context) setConversationContext(res.conversation_context);
      const responseText = res.follow_up_question && !res.response.includes(res.follow_up_question)
        ? `${res.response}\n\n${res.follow_up_question}`
        : res.response;
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: responseText,
        time: now(),
        venues: res.venues?.map(mapVenue),
      }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: t('chatbot.error'), time: now() }]);
    }
    setLoading(false);
    scrollRef.current?.scrollToEnd({ animated: true });
  }

  return (
    <View style={[styles.container, { backgroundColor: tc.background }]}>
      <SafeAreaView edges={['top']} style={[styles.headerSafe, { backgroundColor: tc.white, borderBottomColor: tc.border }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={16}>
            <ChevronLeft size={24} color={tc.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={[styles.botAvatar, { backgroundColor: tc.primary }]}><Bot size={18} color="#fff"/></View>
            <View><Text style={[styles.headerTitle, { color: tc.text }]}>{t('chatbot.title')}</Text><Text style={[styles.headerSubtitle, { color: tc.textMuted }]}>{t('chatbot.subtitle')}</Text></View>
          </View>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView ref={scrollRef} style={[styles.chat, { backgroundColor: tc.background }]} contentContainerStyle={styles.chatContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" onContentSizeChange={()=>scrollRef.current?.scrollToEnd({animated:false})}>
          {messages.map((m,i)=>(
            <View key={i} style={styles.messageBlock}>
              <View style={[styles.msgRow, m.role==='user'?styles.msgRowUser:styles.msgRowBot]}>
                {m.role==='assistant'?<View style={[styles.avatarCircle,{backgroundColor:tc.primary}]}><Bot size={14} color="#fff"/></View>:null}
                <View style={[styles.bubble, m.role==='user' ? [styles.userBubble, { backgroundColor: tc.primary }] : [styles.botBubble, { backgroundColor: tc.white, borderColor: tc.border }]]}>
                  <Text style={[styles.bubbleText, { color: m.role==='user' ? '#fff' : tc.text }]}>{m.text}</Text>
                  <Text style={[styles.timeText, m.role==='user' ? styles.timeRight : { color: tc.textMuted }]}>{m.time}</Text>
                </View>
                {m.role==='user'?<View style={[styles.avatarCircle,{backgroundColor:tc.primaryDark}]}><User size={14} color="#fff"/></View>:null}
              </View>
              {m.venues?.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recommendations}>
                  {m.venues.map(venue => (
                    <Pressable
                      key={venue.id}
                      style={[styles.venueCard, { backgroundColor: tc.white, borderColor: tc.border }]}
                      onPress={() => navigation.navigate('VenueDetail', { venueId: venue.id })}
                    >
                      <View style={styles.venueTopRow}>
                        <Text style={[styles.venueName, { color: tc.text }]} numberOfLines={2}>{venue.name}</Text>
                        <Text style={[styles.venueRating, { color: tc.star }]}>★ {venue.rating}</Text>
                      </View>
                      <Text style={[styles.venueMeta, { color: tc.textMuted }]} numberOfLines={1}>
                        {venue.type} · {venue.distance}
                      </Text>
                      <View style={styles.venueBottomRow}>
                        {venue.suitabilityScore != null ? (
                          <Text style={[styles.venueMatch, { color: tc.primary }]}>{venue.suitabilityScore}% {t('common.match')}</Text>
                        ) : <View />}
                        <Text style={[styles.venuePrice, { color: tc.text }]}>${venue.price}/hr</Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
            </View>
          ))}
          {loading ? <ActivityIndicator size="small" color={tc.primary} style={{padding:8}}/> : null}
        </ScrollView>
        <View style={[styles.inputBar, { borderTopColor: tc.border, backgroundColor: tc.white }]}>
          <TextInput style={[styles.input, { borderColor: tc.border, color: tc.text, backgroundColor: tc.surface }]} placeholder={t('chatbot.placeholder')} placeholderTextColor={tc.textMuted} value={input} onChangeText={setInput} onSubmitEditing={send} returnKeyType="send"/>
          <Pressable style={[styles.sendBtn, { backgroundColor: tc.primary, shadowColor: tc.primary }, !input.trim()&&styles.sendBtnOff]} onPress={send} disabled={!input.trim()||loading}>
            <Send size={16} color="#fff"/>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1},flex:{flex:1},
  headerSafe:{borderBottomWidth:1},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:spacing.md,paddingVertical:spacing.sm},
  backBtn:{width:36,height:36,alignItems:'center',justifyContent:'center'},
  headerCenter:{flexDirection:'row',alignItems:'center',gap:spacing.sm},
  botAvatar:{width:32,height:32,borderRadius:16,alignItems:'center',justifyContent:'center'},
  headerTitle:{fontSize:16,fontWeight:'600'},
  headerSubtitle:{fontSize:11},
  chat:{flex:1},
  chatContent:{padding:spacing.md,gap:12,paddingBottom:spacing.xl},
  messageBlock:{gap:8},
  msgRow:{flexDirection:'row',alignItems:'flex-end',gap:8},
  msgRowUser:{justifyContent:'flex-end'},msgRowBot:{justifyContent:'flex-start'},
  avatarCircle:{width:30,height:30,borderRadius:15,alignItems:'center',justifyContent:'center',marginBottom:3},
  bubble:{maxWidth:'78%',borderRadius:20,paddingHorizontal:14,paddingVertical:10},
  userBubble:{borderBottomRightRadius:6},
  botBubble:{borderWidth:1,borderBottomLeftRadius:6,elevation:1,shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.04,shadowRadius:3},
  bubbleText:{fontSize:15,lineHeight:23},
  timeText:{fontSize:10,marginTop:4},timeRight:{color:'rgba(255,255,255,0.6)',textAlign:'right'},
  inputBar:{flexDirection:'row',alignItems:'flex-end',gap:10,padding:spacing.md,paddingBottom:spacing.lg,borderTopWidth:1},
  input:{flex:1,borderWidth:1,borderRadius:24,paddingHorizontal:16,paddingVertical:11,fontSize:15,maxHeight:100},
  sendBtn:{width:42,height:42,borderRadius:21,alignItems:'center',justifyContent:'center',elevation:3,shadowOffset:{width:0,height:2},shadowOpacity:0.2,shadowRadius:4},
  sendBtnOff:{opacity:0.4},
  recommendations:{paddingLeft:38,paddingRight:spacing.sm,gap:spacing.sm},
  venueCard:{width:210,borderWidth:1,borderRadius:14,padding:spacing.md,gap:6,elevation:1,shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.05,shadowRadius:3},
  venueTopRow:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},
  venueName:{flex:1,fontSize:14,fontWeight:'700',lineHeight:19},
  venueRating:{fontSize:12,fontWeight:'700'},
  venueMeta:{fontSize:12},
  venueBottomRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:2},
  venueMatch:{fontSize:12,fontWeight:'700'},
  venuePrice:{fontSize:13,fontWeight:'700'},
});

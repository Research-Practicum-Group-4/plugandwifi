import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronLeft, Send, Bot, User } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackScreenProps } from '../../types/navigation';

type Message = { role: 'user' | 'assistant'; text: string; time: string };

const DEMO_REPLIES = [
  "That's a great question! Once connected to the backend, I'll be able to compare venues by price, ratings, WiFi quality, and noise level.",
  "I can help you find the perfect workspace. In the full version, I'll check venue availability, compare amenities, and suggest the best options near you.",
  "Looking for a quiet spot with fast WiFi? When the backend is ready, I'll search your area and rank venues based on your preferences.",
];

function now() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}
let replyIdx = 0;

export function ChatbotScreen({ navigation }: RootStackScreenProps<'Chatbot'>) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Hi! I\'m your workspace assistant. Ask me about venues, availability, or workspace tips.', time: now() },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  function send() {
    const text = input.trim();
    if (!text) return;
    setMessages(prev => [...prev, { role: 'user', text, time: now() }]);
    setInput('');
    setTimeout(() => {
      const reply = DEMO_REPLIES[replyIdx % DEMO_REPLIES.length];
      replyIdx++;
      setMessages(prev => [...prev, { role: 'assistant', text: reply, time: now() }]);
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 600);
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={16}>
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={styles.botAvatar}>
              <Bot size={18} color={colors.white} />
            </View>
            <View>
              <Text style={styles.headerTitle}>AI Assistant</Text>
              <Text style={styles.headerSubtitle}>Workspace Expert</Text>
            </View>
          </View>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} style={styles.chat} contentContainerStyle={styles.chatContent} showsVerticalScrollIndicator={false} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
          {messages.map((m, i) => (
            <View key={i} style={[styles.msgRow, m.role === 'user' ? styles.msgRowUser : styles.msgRowBot]}>
              {m.role === 'assistant' ? (
                <View style={styles.avatarCircle}>
                  <Bot size={14} color={colors.white} />
                </View>
              ) : null}
              <View style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.botBubble]}>
                <Text style={[styles.bubbleText, m.role === 'user' ? styles.userBubbleText : styles.botBubbleText]}>
                  {m.text}
                </Text>
                <Text style={[styles.timeText, m.role === 'user' ? styles.timeRight : styles.timeLeft]}>{m.time}</Text>
              </View>
              {m.role === 'user' ? (
                <View style={[styles.avatarCircle, { backgroundColor: colors.primaryDark }]}>
                  <User size={14} color={colors.white} />
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Ask about workspaces..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={send}
            returnKeyType="send"
            multiline={false}
          />
          <Pressable style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]} onPress={send} disabled={!input.trim()}>
            <Send size={16} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  headerSafe: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  botAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  headerSubtitle: { fontSize: 11, color: colors.textMuted },
  chat: { flex: 1 },
  chatContent: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowBot: { justifyContent: 'flex-start' },
  avatarCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  bubble: { maxWidth: '75%', borderRadius: 18, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  botBubble: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userBubbleText: { color: colors.white },
  botBubbleText: { color: colors.text },
  timeText: { fontSize: 10, marginTop: 4 },
  timeRight: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  timeLeft: { color: colors.textMuted, textAlign: 'left' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md, paddingBottom: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 22, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, color: colors.text, backgroundColor: colors.surface, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});

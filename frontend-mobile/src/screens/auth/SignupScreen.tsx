import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, Alert } from 'react-native';
import { Eye, EyeOff, ChevronLeft, User, Mail, Lock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../theme/spacing';
import { localizedApiError } from '../../utils/apiError';
import type { RootStackScreenProps } from '../../types/navigation';

export function SignupScreen({ navigation, route }: RootStackScreenProps<'Signup'>) {
  const { register } = useAuth();
  const { colors: tc } = useTheme();
  const { t } = useT();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function returnToLogin() {
    if (route.params?.returnToLogin && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('Login');
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t('account.nameRequired');
    if (!email.trim()) newErrors.email = t('account.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = t('account.emailInvalid');
    if (!password) newErrors.password = t('account.passwordRequired');
    else if (password.length < 8) newErrors.password = t('account.passwordMin');
    if (!confirmPassword) newErrors.confirmPassword = t('account.confirmRequired');
    else if (password !== confirmPassword) newErrors.confirmPassword = t('account.passwordMismatch');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSignup() {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await register({ full_name: name.trim(), email: email.trim(), password });
      Alert.alert(t('account.accountCreated'), t('account.accountCreatedMsg'), [
        { text: t('common.ok'), onPress: returnToLogin },
      ]);
    } catch (error) {
      Alert.alert(
        t('account.registrationFailed'),
        localizedApiError(error, t, 'account.registrationFailedMessage', {
          conflict: 'account.emailAlreadyRegistered',
          validation: 'account.registrationInvalid',
        }),
      );
    } finally { setIsSubmitting(false); }
  }

  return (
    <View style={[styles.container, { backgroundColor: tc.background }]}>
      <SafeAreaView edges={['top']} style={[styles.headerSafe, { backgroundColor: tc.white, borderBottomColor: tc.border }]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <ChevronLeft size={24} color={tc.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: tc.text }]}>{t('account.createAccount')}</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: tc.textMuted }]}>{t('account.joinPlugWifi')}</Text>

        <View style={styles.form}>
          <View style={[styles.inputRow, { borderColor: tc.border, backgroundColor: tc.white }, errors.name && { borderColor: tc.danger }]}>
            <User size={18} color={tc.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: tc.text }]}
              placeholder={t('account.fullName')}
              placeholderTextColor={tc.textMuted}
              value={name}
              onChangeText={value => { setName(value); if (errors.name) setErrors(p => { const next = { ...p }; delete next.name; return next; }); }}
            />
          </View>
          {errors.name ? <Text style={[styles.errorText, { color: tc.danger }]}>{errors.name}</Text> : null}

          <View style={[styles.inputRow, { borderColor: tc.border, backgroundColor: tc.white }, errors.email && { borderColor: tc.danger }]}>
            <Mail size={18} color={tc.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: tc.text }]}
              placeholder={t('account.email')}
              placeholderTextColor={tc.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={value => { setEmail(value); if (errors.email) setErrors(p => { const next = { ...p }; delete next.email; return next; }); }}
            />
          </View>
          {errors.email ? <Text style={[styles.errorText, { color: tc.danger }]}>{errors.email}</Text> : null}

          <View style={[styles.inputRow, { borderColor: tc.border, backgroundColor: tc.white }, errors.password && { borderColor: tc.danger }]}>
            <Lock size={18} color={tc.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: tc.text }]}
              placeholder={t('account.password')}
              placeholderTextColor={tc.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={value => { setPassword(value); if (errors.password) setErrors(p => { const next = { ...p }; delete next.password; return next; }); }}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn} hitSlop={8}>
              {showPassword ? <EyeOff size={18} color={tc.textMuted} /> : <Eye size={18} color={tc.textMuted} />}
            </Pressable>
          </View>
          {errors.password ? <Text style={[styles.errorText, { color: tc.danger }]}>{errors.password}</Text> : null}
          <Text style={[styles.hint, { color: tc.textMuted }]}>{t('account.atLeast8')}</Text>

          <View style={[styles.inputRow, { borderColor: tc.border, backgroundColor: tc.white }, errors.confirmPassword && { borderColor: tc.danger }]}>
            <Lock size={18} color={tc.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: tc.text }]}
              placeholder={t('account.confirmPassword')}
              placeholderTextColor={tc.textMuted}
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={value => { setConfirmPassword(value); if (errors.confirmPassword) setErrors(p => { const next = { ...p }; delete next.confirmPassword; return next; }); }}
            />
            <Pressable onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn} hitSlop={8}>
              {showConfirm ? <EyeOff size={18} color={tc.textMuted} /> : <Eye size={18} color={tc.textMuted} />}
            </Pressable>
          </View>
          {errors.confirmPassword ? <Text style={[styles.errorText, { color: tc.danger }]}>{errors.confirmPassword}</Text> : null}

          <PrimaryButton label={isSubmitting ? t('account.creating') : t('account.createAccount')} disabled={isSubmitting} onPress={handleSignup} />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: tc.textMuted }]}>{t('account.alreadyHaveAccount')}</Text>
          <Pressable onPress={returnToLogin}>
            <Text style={[styles.footerLink, { color: tc.primary }]}>{t('account.signIn')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerSafe: { borderBottomWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  body: { flex: 1 },
  bodyContent: { padding: spacing.lg, gap: spacing.lg },
  subtitle: { fontSize: 14, textAlign: 'center' },
  form: { gap: spacing.sm },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12, overflow: 'hidden',
  },
  inputIcon: { marginLeft: spacing.md },
  input: { flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, fontSize: 15 },
  eyeBtn: { paddingHorizontal: spacing.md },
  errorText: { fontSize: 12, marginLeft: 4 },
  hint: { fontSize: 12, marginLeft: 4 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: '600' },
});

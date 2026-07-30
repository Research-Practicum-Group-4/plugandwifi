import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, Alert } from 'react-native';
import { Eye, EyeOff, ChevronLeft, Mail, Lock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../theme/spacing';
import { localizedApiError } from '../../utils/apiError';
import type { RootStackScreenProps } from '../../types/navigation';

export function LoginScreen({ navigation }: RootStackScreenProps<'Login'>) {
  const { login } = useAuth();
  const { colors: tc } = useTheme();
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) newErrors.email = t('account.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = t('account.emailInvalid');
    if (!password) newErrors.password = t('account.passwordRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        t('account.loginFailed'),
        localizedApiError(error, t, 'account.loginFailedMessage', {
          unauthorized: 'account.invalidCredentials',
          validation: 'account.invalidCredentials',
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
          <Text style={[styles.headerTitle, { color: tc.text }]}>{t('account.signIn')}</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: tc.textMuted }]}>{t('account.welcomeBack')}</Text>

        <View style={styles.form}>
          <View style={[styles.inputRow, { borderColor: tc.border, backgroundColor: tc.white }, errors.email && { borderColor: tc.danger }]}>
            <Mail size={18} color={tc.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: tc.text }]}
              placeholder={t('account.email')}
              placeholderTextColor={tc.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={t => { setEmail(t); if (errors.email) setErrors(p => ({ ...p, email: undefined })); }}
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
              onChangeText={t => { setPassword(t); if (errors.password) setErrors(p => ({ ...p, password: undefined })); }}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn} hitSlop={8}>
              {showPassword ? <EyeOff size={18} color={tc.textMuted} /> : <Eye size={18} color={tc.textMuted} />}
            </Pressable>
          </View>
          {errors.password ? <Text style={[styles.errorText, { color: tc.danger }]}>{errors.password}</Text> : null}

          <PrimaryButton label={isSubmitting ? t('account.signingIn') : t('account.signIn')} disabled={isSubmitting} onPress={handleLogin} />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: tc.textMuted }]}>{t('account.noAccount')}</Text>
          <Pressable onPress={() => navigation.navigate('Signup', { returnToLogin: true })}>
            <Text style={[styles.footerLink, { color: tc.primary }]}>{t('account.signUp')}</Text>
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
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: '600' },
});

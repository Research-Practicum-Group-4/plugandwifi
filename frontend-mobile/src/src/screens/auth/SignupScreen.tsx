import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, Alert } from 'react-native';
import { Eye, EyeOff, ChevronLeft, User, Mail, Lock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackScreenProps } from '../../types/navigation';

export function SignupScreen({ navigation }: RootStackScreenProps<'Signup'>) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email format';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'Must be at least 8 characters';
    if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSignup() {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await register({ full_name: name.trim(), email: email.trim(), password });
      Alert.alert('Account Created', 'Please sign in with your new account.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error) {
      Alert.alert('Registration Failed', error instanceof Error ? error.message : 'Registration failed');
    } finally { setIsSubmitting(false); }
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Create Account</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Join Plug & Wifi and start booking workspaces</Text>

        <View style={styles.form}>
          <View style={styles.inputRow}>
            <User size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Full Name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={t => { setName(t); if (errors.name) setErrors(p => { const { name: _, ...r } = p; return r; }); }}
            />
          </View>
          {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

          <View style={styles.inputRow}>
            <Mail size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={t => { setEmail(t); if (errors.email) setErrors(p => { const { email: _, ...r } = p; return r; }); }}
            />
          </View>
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

          <View style={[styles.inputRow, errors.password && styles.inputError]}>
            <Lock size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={t => { setPassword(t); if (errors.password) setErrors(p => { const { password: _, ...r } = p; return r; }); }}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn} hitSlop={8}>
              {showPassword ? <EyeOff size={18} color={colors.textMuted} /> : <Eye size={18} color={colors.textMuted} />}
            </Pressable>
          </View>
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          <Text style={styles.hint}>At least 8 characters</Text>

          <View style={[styles.inputRow, errors.confirmPassword && styles.inputError]}>
            <Lock size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={t => { setConfirmPassword(t); if (errors.confirmPassword) setErrors(p => { const { confirmPassword: _, ...r } = p; return r; }); }}
            />
            <Pressable onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn} hitSlop={8}>
              {showConfirm ? <EyeOff size={18} color={colors.textMuted} /> : <Eye size={18} color={colors.textMuted} />}
            </Pressable>
          </View>
          {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}

          <PrimaryButton label={isSubmitting ? 'Creating...' : 'Create Account'} disabled={isSubmitting} onPress={handleSignup} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Sign in</Text>
          </Pressable>
        </View>
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
  bodyContent: { padding: spacing.lg, gap: spacing.lg },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  form: { gap: spacing.sm },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    backgroundColor: colors.white, overflow: 'hidden',
  },
  inputIcon: { marginLeft: spacing.md },
  input: { flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, fontSize: 15, color: colors.text },
  inputError: { borderColor: colors.danger },
  eyeBtn: { paddingHorizontal: spacing.md },
  errorText: { color: colors.danger, fontSize: 12, marginLeft: 4 },
  hint: { color: colors.textMuted, fontSize: 12, marginLeft: 4 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  footerText: { fontSize: 14, color: colors.textMuted },
  footerLink: { fontSize: 14, fontWeight: '600', color: colors.primary },
});

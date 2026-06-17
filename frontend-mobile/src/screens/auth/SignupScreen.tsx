import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, Alert } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { Logo } from '../../components/Logo';
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
  const [userType, setUserType] = useState<'seeker' | 'provider'>('seeker');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Must be at least 8 characters';
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function clearError(field: string) {
    setErrors(prev => { const { [field]: _, ...rest } = prev; return rest; });
  }

  async function handleSignup() {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await register({ full_name: name.trim(), email: email.trim(), password });
      Alert.alert('Account Created', 'Please sign in with your new account.', [
        { text: 'OK', onPress: () => navigation.replace('Login') },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      Alert.alert('Registration Failed', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoSection}>
          <Logo />
          <Text style={styles.title}>Create Account</Text>
        </View>

        <Text style={styles.sectionLabel}>I want to</Text>
        <View style={styles.roleGroup}>
          <Pressable
            style={[styles.roleCard, userType === 'seeker' && styles.roleCardActive]}
            onPress={() => setUserType('seeker')}
          >
            <View style={[styles.radio, userType === 'seeker' && styles.radioActive]} />
            <View style={styles.roleText}>
              <Text style={styles.roleTitle}>Find workspace</Text>
              <Text style={styles.roleDesc}>Book spaces to work</Text>
            </View>
          </Pressable>
          <Pressable
            style={[styles.roleCard, userType === 'provider' && styles.roleCardActive]}
            onPress={() => setUserType('provider')}
          >
            <View style={[styles.radio, userType === 'provider' && styles.radioActive]} />
            <View style={styles.roleText}>
              <Text style={styles.roleTitle}>Offer workspace</Text>
              <Text style={styles.roleDesc}>List my venue</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.form}>
          <View>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Your full name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={text => { setName(text); if (errors.name) clearError('name'); }}
            />
            {errors.name ? <Text style={styles.error}>{errors.name}</Text> : null}
          </View>

          <View>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={text => { setEmail(text); if (errors.email) clearError('email'); }}
            />
            {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}
          </View>

          <View>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.passwordWrap, errors.password && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={text => { setPassword(text); if (errors.password) clearError('password'); }}
              />
              <Pressable onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                {showPassword ? <EyeOff size={20} color={colors.textMuted} /> : <Eye size={20} color={colors.textMuted} />}
              </Pressable>
            </View>
            {errors.password ? <Text style={styles.error}>{errors.password}</Text> : <Text style={styles.hint}>Minimum 8 characters</Text>}
          </View>

          <View>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={[styles.passwordWrap, errors.confirmPassword && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={text => { setConfirmPassword(text); if (errors.confirmPassword) clearError('confirmPassword'); }}
              />
              <Pressable onPress={() => setShowConfirm(v => !v)} style={styles.eyeBtn}>
                {showConfirm ? <EyeOff size={20} color={colors.textMuted} /> : <Eye size={20} color={colors.textMuted} />}
              </Pressable>
            </View>
            {errors.confirmPassword ? <Text style={styles.error}>{errors.confirmPassword}</Text> : null}
          </View>

          <PrimaryButton
            label={isSubmitting ? 'Creating Account...' : 'Create Account'}
            disabled={isSubmitting}
            onPress={handleSignup}
          />
        </View>

        <View style={styles.separatorRow}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>or</Text>
          <View style={styles.separatorLine} />
        </View>

        <View style={styles.socialRow}>
          <PrimaryButton label="Google" variant="outline" disabled />
          <PrimaryButton label="Apple" variant="outline" disabled />
        </View>
      </ScrollView>

      <Text style={styles.footer}>
        Already have an account?{' '}
        <Text style={styles.link} onPress={() => navigation.replace('Login')}>Sign in</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  scrollContent: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  roleGroup: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: colors.white,
  },
  roleCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#f0faf5',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioActive: {
    borderColor: colors.primary,
    borderWidth: 6,
  },
  roleText: {
    flex: 1,
  },
  roleTitle: {
    fontWeight: '600',
    fontSize: 15,
    color: colors.text,
  },
  roleDesc: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  form: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 4,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.white,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  eyeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  separatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  separatorText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  socialRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  footer: {
    textAlign: 'center',
    color: colors.textMuted,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  link: {
    color: colors.primary,
    fontWeight: '600',
  },
});

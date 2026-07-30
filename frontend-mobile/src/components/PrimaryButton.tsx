import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';

type PrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
}: PrimaryButtonProps) {
  const { colors: tc } = useTheme();

  return (
    <Pressable
      style={[
        S.button,
        variant === 'primary' && { backgroundColor: tc.primary },
        variant === 'secondary' && { backgroundColor: tc.primaryDark },
        variant === 'outline' && { backgroundColor: tc.white, borderWidth: 1, borderColor: tc.border },
        disabled && S.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}>
      <Text
        style={[
          S.label,
          variant === 'outline' && [S.outlineLabel, { color: tc.text }],
          disabled && S.disabledLabel,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const S = StyleSheet.create({
  button: {
    borderRadius: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  outlineLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabledLabel: {
    color: '#9ca3af',
  },
});

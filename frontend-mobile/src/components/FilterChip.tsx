import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';

type FilterChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function FilterChip({ label, selected = false, onPress }: FilterChipProps) {
  const { colors: tc } = useTheme();
  return (
    <Pressable
      style={[S.chip, { borderColor: tc.border, backgroundColor: tc.white }, selected && { borderColor: tc.primary, backgroundColor: '#e8f5ef' }]}
      onPress={onPress}>
      <Text style={[S.label, { color: tc.text }, selected && { color: tc.primary, fontWeight: '600' }]}>{label}</Text>
    </Pressable>
  );
}

const S = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: {
    fontSize: 13,
  },
});

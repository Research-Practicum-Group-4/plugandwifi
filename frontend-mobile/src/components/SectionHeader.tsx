import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
};

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  const { colors: tc } = useTheme();
  return (
    <View style={S.container}>
      <Text style={[S.title, { color: tc.text }]}>{title}</Text>
      {subtitle ? <Text style={[S.subtitle, { color: tc.textMuted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const S = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
});

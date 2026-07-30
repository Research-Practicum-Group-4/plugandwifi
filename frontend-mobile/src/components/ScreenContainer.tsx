import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';

type ScreenContainerProps = {
  children: ReactNode;
  scroll?: boolean;
};

export function ScreenContainer({ children, scroll = true }: ScreenContainerProps) {
  const { colors: tc } = useTheme();
  if (scroll) {
    return (
      <SafeAreaView style={[S.safeArea, { backgroundColor: tc.background }]} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={S.content}
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[S.safeArea, { backgroundColor: tc.background }]} edges={['top', 'left', 'right']}>
      <View style={S.content}>{children}</View>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
});

import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import type { RootStackScreenProps } from '../types/navigation';

export function NotFoundScreen({ navigation }: RootStackScreenProps<'NotFound'>) {
  return (
    <ScreenContainer scroll={false}>
      <View style={styles.container}>
        <SectionHeader
          title="404"
          subtitle="The page you're looking for doesn't exist or has been moved."
        />
        <View style={styles.actions}>
          <PrimaryButton label="Go Home" onPress={() => navigation.popToTop()} />
          <PrimaryButton
            label="Browse Spaces"
            variant="outline"
            onPress={() => navigation.navigate('MainTabs', { screen: 'Search' })}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  actions: {
    gap: spacing.sm,
  },
});

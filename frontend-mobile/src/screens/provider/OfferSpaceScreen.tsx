import { StyleSheet, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SectionHeader } from '../../components/SectionHeader';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackScreenProps } from '../../types/navigation';

export function OfferSpaceScreen({
  navigation,
}: RootStackScreenProps<'OfferSpace'>) {
  return (
    <ScreenContainer>
      <SectionHeader
        title="List Your Space"
        subtitle="Share your venue with remote professionals"
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <TextInput style={styles.input} placeholder="Space Name" placeholderTextColor={colors.textMuted} />
        <TextInput style={styles.input} placeholder="Space Type (Hotel Lobby / Cafe)" placeholderTextColor={colors.textMuted} />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description"
          placeholderTextColor={colors.textMuted}
          multiline
        />
        <TextInput style={styles.input} placeholder="Capacity" placeholderTextColor={colors.textMuted} keyboardType="number-pad" />
        <TextInput style={styles.input} placeholder="Price per Hour ($)" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <TextInput style={styles.input} placeholder="Street Address" placeholderTextColor={colors.textMuted} />
        <TextInput style={styles.input} placeholder="City" placeholderTextColor={colors.textMuted} />
        <TextInput style={styles.input} placeholder="ZIP Code" placeholderTextColor={colors.textMuted} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Amenities & Services</Text>
        <Text style={styles.checkboxLine}>WiFi Available</Text>
        <Text style={styles.checkboxLine}>Power Outlets</Text>
        <Text style={styles.checkboxLine}>Complimentary Water / Coffee / Tea</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Booking Extensions</Text>
        <Text style={styles.checkboxLine}>Allow guests to extend their booking</Text>
      </View>

      <PrimaryButton
        label="Create Listing"
        onPress={() => navigation.navigate('ProviderDashboard')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    backgroundColor: colors.white,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  checkboxLine: {
    color: colors.textMuted,
    paddingVertical: spacing.xs,
  },
});

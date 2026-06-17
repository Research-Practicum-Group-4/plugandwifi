import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SectionHeader } from '../../components/SectionHeader';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackScreenProps } from '../../types/navigation';

export function CheckoutScreen({
  navigation,
  route,
}: RootStackScreenProps<'Checkout'>) {
  const { venueName, duration, price } = route.params;
  const [processing, setProcessing] = useState(false);

  const serviceFee = 2;
  const total = price + serviceFee;

  const handleCompleteBooking = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      navigation.popToTop();
    }, 800);
  };

  return (
    <ScreenContainer>
      <SectionHeader title="Checkout" subtitle="Complete your workspace booking" />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Contact Information</Text>
        <TextInput style={styles.input} placeholder="First Name" placeholderTextColor={colors.textMuted} />
        <TextInput style={styles.input} placeholder="Last Name" placeholderTextColor={colors.textMuted} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment Method</Text>
        <TextInput style={styles.input} placeholder="Card Number" placeholderTextColor={colors.textMuted} />
        <View style={styles.row}>
          <TextInput style={[styles.input, styles.halfInput]} placeholder="Expiry" placeholderTextColor={colors.textMuted} />
          <TextInput style={[styles.input, styles.halfInput]} placeholder="CVV" placeholderTextColor={colors.textMuted} />
        </View>
        <TextInput style={styles.input} placeholder="Name on Card" placeholderTextColor={colors.textMuted} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Booking Summary</Text>
        <Text style={styles.summaryLine}>{venueName}</Text>
        <Text style={styles.summaryLine}>Duration: {duration} hours</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLine}>Workspace rental</Text>
          <Text style={styles.summaryLine}>${price}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLine}>Service fee</Text>
          <Text style={styles.summaryLine}>${serviceFee}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${total}</Text>
        </View>
        <Text style={styles.note}>Free cancellation up to 1 hour before booking</Text>
      </View>

      <PrimaryButton
        label={processing ? 'Processing...' : 'Complete Booking'}
        disabled={processing}
        onPress={handleCompleteBooking}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.white,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    backgroundColor: colors.white,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfInput: {
    flex: 1,
  },
  summaryLine: {
    color: colors.textMuted,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  note: {
    color: colors.textMuted,
    fontSize: 13,
  },
});

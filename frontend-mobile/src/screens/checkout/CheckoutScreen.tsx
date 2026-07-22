import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SectionHeader } from '../../components/SectionHeader';
import { useAuth } from '../../context/AuthContext';
import { confirmMockPayment, createBooking } from '../../services/bookings';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackScreenProps } from '../../types/navigation';

export function CheckoutScreen({
  navigation,
  route,
}: RootStackScreenProps<'Checkout'>) {
  const { venueId, venueName, duration, price } = route.params;
  const { token } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12/30');
  const [cvc, setCvc] = useState('123');
  const [cardName, setCardName] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const serviceFee = 2;
  const total = price + serviceFee;

  const handleCompleteBooking = async () => {
    setProcessing(true);
    setMessage(null);

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const bookingDuration = Number(duration || 2);
      const booking = await createBooking(
        {
          venue_id: venueId,
          booking_date: tomorrow.toISOString().split('T')[0],
          start_time: '09:00:00',
          end_time: `${String(9 + bookingDuration).padStart(2, '0')}:00:00`,
          seats_reserved: 1,
        },
        token ?? undefined,
      );

      const payment = await confirmMockPayment(
        {
          booking_id: booking.id,
          card_number: cardNumber,
        },
        token ?? undefined,
      );

      if (payment.payment_status !== 'paid') {
        throw new Error(payment.message || 'Payment failed.');
      }

      setProcessing(false);
      setMessage(`Order #${payment.order_id} confirmed.`);
      navigation.popToTop();
    } catch (error) {
      setProcessing(false);
      setMessage(error instanceof Error ? error.message : 'Checkout failed.');
    }
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
        <TextInput
          style={styles.input}
          placeholder="Card Number"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          value={cardNumber}
          onChangeText={setCardNumber}
        />
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Expiry"
            placeholderTextColor={colors.textMuted}
            value={expiry}
            onChangeText={setExpiry}
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="CVV"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            value={cvc}
            onChangeText={setCvc}
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Name on Card"
          placeholderTextColor={colors.textMuted}
          value={cardName}
          onChangeText={setCardName}
        />
        <Text style={styles.demoText}>
          Demo cards: 4242 4242 4242 4242 succeeds, 4000 0000 0000 0002 fails.
        </Text>
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
        label={processing ? 'Processing payment...' : 'Pay & Confirm Booking'}
        disabled={processing}
        onPress={handleCompleteBooking}
      />
      {message ? <Text style={styles.message}>{message}</Text> : null}
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
  demoText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  message: {
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

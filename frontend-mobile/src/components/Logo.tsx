import { StyleSheet, Text, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { colors } from '../theme/colors';

export function Logo() {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <MapPin size={22} color={colors.white} />
      </View>
      <Text style={styles.text}>Plug & Wifi</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
});

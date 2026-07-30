import { StyleSheet, Text, View } from 'react-native';
import { PlugZap } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export function LogoImage() {
  const { colors: tc } = useTheme();

  return (
    <View style={styles.wrap} accessibilityRole="image" accessibilityLabel="Plug and Wifi">
      <View style={[styles.iconWrap, { backgroundColor: tc.primary + '1f' }]}>
        <PlugZap size={19} color={tc.primary} strokeWidth={2.5} />
      </View>
      <Text style={[styles.brand, { color: tc.text }]}>Plug</Text>
      <Text style={[styles.ampersand, { color: tc.textMuted }]}>&amp;</Text>
      <Text style={[styles.brand, { color: tc.primary }]}>Wifi</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 42, flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 2 },
  brand: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  ampersand: { fontSize: 18, fontWeight: '500' },
});

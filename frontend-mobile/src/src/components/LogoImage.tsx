import { Image, StyleSheet, View } from 'react-native';

const logoSource = require('../../assets/logo.jpg');

export function LogoImage() {
  return (
    <View style={styles.wrap}>
      <View style={styles.shift}>
        <Image source={logoSource} style={styles.img} resizeMode="cover" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 54, width: 220, overflow: 'hidden', alignSelf: 'flex-start', marginLeft: -16 },
  shift: { position: 'absolute', left: -60, top: 0 },
  img: { height: 54, width: 300 },
});

import { useRef } from 'react';
import { Animated, PanResponder, StyleSheet } from 'react-native';
import { Bot } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { colors } from '../theme/colors';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ChatbotFAB() {
  const navigation = useNavigation<Nav>();
  const pan = useRef(new Animated.ValueXY()).current;
  const isDragging = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isDragging.current = false;
        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gesture) => {
        if (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4) isDragging.current = true;
        pan.flattenOffset();
        if (!isDragging.current) navigation.navigate('Chatbot');
      },
    }),
  ).current;

  return (
    <Animated.View style={[styles.fab, { transform: pan.getTranslateTransform() }]} {...panResponder.panHandlers}>
      <Bot size={22} color={colors.white} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute', bottom: 24, right: 18,
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5,
  },
});

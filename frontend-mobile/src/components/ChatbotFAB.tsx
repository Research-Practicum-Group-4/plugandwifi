import { useEffect, useRef } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet } from 'react-native';
import { Bot } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { useTheme } from '../context/ThemeContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ChatbotFAB() {
  const navigation = useNavigation<Nav>();
  const { colors: tc } = useTheme();
  const pan = useRef(new Animated.ValueXY()).current;
  // Tracks the current translation without touching the private _value API
  const panValue = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  useEffect(() => {
    const id = pan.addListener(v => { panValue.current = v; });
    return () => pan.removeListener(id);
  }, [pan]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isDragging.current = false;
        pan.setOffset({ x: panValue.current.x, y: panValue.current.y });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gesture) => {
        if (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4) isDragging.current = true;
        pan.flattenOffset();
        if (!isDragging.current) { navigation.navigate('Chatbot'); return; }
        // Base position is bottom-right; offsets are negative when moving left/up.
        // Spring back if released outside the visible screen area.
        const { width, height } = Dimensions.get('window');
        const { x, y } = panValue.current;
        const clampedX = Math.min(0, Math.max(-(width - 68), x));
        const clampedY = Math.min(0, Math.max(-(height - 160), y));
        if (clampedX !== x || clampedY !== y) {
          Animated.spring(pan, { toValue: { x: clampedX, y: clampedY }, useNativeDriver: false }).start();
        }
      },
    }),
  ).current;

  return (
    <Animated.View style={[S.fab, { backgroundColor: tc.primary, shadowColor: tc.primary }, { transform: pan.getTranslateTransform() }]} {...panResponder.panHandlers}>
      <Bot size={22} color="#fff" />
    </Animated.View>
  );
}

const S = StyleSheet.create({
  fab: {
    position: 'absolute', bottom: 92, right: 18,
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5,
  },
});

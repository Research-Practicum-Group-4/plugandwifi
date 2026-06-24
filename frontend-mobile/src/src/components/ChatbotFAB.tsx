import { useRef } from 'react';
import { Animated, PanResponder, StyleSheet } from 'react-native';
import { Bot } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { colors } from '../theme/colors';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const FAB_SIZE = 56;

export function ChatbotFAB() {
  const navigation = useNavigation<Nav>();
  const pan = useRef(new Animated.ValueXY()).current;
  const dragStart = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isDragging.current = false;
        dragStart.current = { x: (pan.x as any)._value, y: (pan.y as any)._value };
        pan.setOffset({ x: dragStart.current.x, y: dragStart.current.y });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gesture) => {
        const moved = Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4;
        if (moved) isDragging.current = true;
        pan.flattenOffset();
        if (!isDragging.current) {
          navigation.navigate('Chatbot');
        }
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
      },
    }),
  ).current;

  return (
    <Animated.View
      style={[styles.fab, { transform: pan.getTranslateTransform() }]}
      {...panResponder.panHandlers}
    >
      <Bot size={24} color={colors.white} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
});

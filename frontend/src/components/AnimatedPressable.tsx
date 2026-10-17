import type { ComponentProps } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);

type NativePressableProps = ComponentProps<typeof Pressable>;

type AnimatedPressableProps = Omit<
  NativePressableProps,
  'style' | 'onPressIn' | 'onPressOut'
> & {
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
  onPressIn?: (event: GestureResponderEvent) => void;
  onPressOut?: (event: GestureResponderEvent) => void;
};

export function AnimatedPressable({
  disabled,
  onPressIn,
  onPressOut,
  pressedScale = 0.96,
  style,
  ...props
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (event: GestureResponderEvent) => {
    scale.value = withTiming(pressedScale, { duration: 80 });
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    scale.value = withSpring(1, { damping: 16, stiffness: 260 });
    onPressOut?.(event);
  };

  return (
    <ReanimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, disabled && disabledStyle, animatedStyle]}
    />
  );
}

const disabledStyle: ViewStyle = {
  opacity: 0.55,
};

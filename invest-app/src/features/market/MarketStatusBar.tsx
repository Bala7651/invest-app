import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { computeStatus } from './marketHours';

export function MarketStatusBar() {
  const [status, setStatus] = useState(() => computeStatus());
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (status.open) {
      opacity.value = withRepeat(withTiming(0.3, { duration: 800 }), -1, true);
    } else {
      opacity.value = 1;
    }

    const interval = setInterval(() => setStatus(computeStatus()), 60_000);
    return () => clearInterval(interval);
  }, [status.open]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View className="flex-row items-center gap-1">
      <Animated.View
        style={[{ width: 8, height: 8, borderRadius: 4 }, dotStyle]}
        className={status.open ? 'bg-stock-up' : 'bg-muted'}
      />
      <Text className={`text-xs ${status.open ? 'text-stock-up' : 'text-muted'}`}>
        {status.label}
      </Text>
    </View>
  );
}

import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { computeStatus } from './marketHours';
import { useI18n } from '../i18n/useI18n';

export function MarketStatusBar() {
  const { language } = useI18n();
  const [status, setStatus] = useState(() => computeStatus(new Date(), language));
  const opacity = useSharedValue(1);

  useEffect(() => {
    setStatus(computeStatus(new Date(), language));
    if (status.open) {
      opacity.value = withRepeat(withTiming(0.3, { duration: 800 }), -1, true);
    } else {
      opacity.value = 1;
    }

    const interval = setInterval(() => setStatus(computeStatus(new Date(), language)), 60_000);
    return () => clearInterval(interval);
  }, [language, status.open]);

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

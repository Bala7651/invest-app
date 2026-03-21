import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
  cancelAnimation,
} from 'react-native-reanimated';

export function AnalysisSkeleton() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.3, { duration: 900 }), -1, true);
    return () => {
      cancelAnimation(opacity);
    };
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View className="bg-surface border border-border rounded-lg p-4 mb-3">
      <View className="flex-row justify-between items-center">
        <Animated.View
          style={[{ height: 16, width: 80, borderRadius: 4 }, animStyle]}
          className="bg-border"
        />
        <Animated.View
          style={[{ height: 16, width: 60, borderRadius: 4 }, animStyle]}
          className="bg-border"
        />
      </View>
      <Animated.View
        style={[{ height: 14, width: 160, borderRadius: 4, marginTop: 10 }, animStyle]}
        className="bg-border"
      />
    </View>
  );
}

import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface ChartSkeletonProps {
  height: number;
}

export function ChartSkeleton({ height }: ChartSkeletonProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.3, { duration: 800 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={{ height }}>
      <Animated.View
        style={[{ flex: 1, borderRadius: 8 }, animatedStyle]}
        className="bg-surface"
      />
    </View>
  );
}

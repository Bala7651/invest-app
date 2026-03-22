import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface EmptyWatchlistProps {
  onAddPress: () => void;
}

function NeonChartIcon() {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
    return () => {
      cancelAnimation(opacity);
    };
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[{ marginBottom: 24 }, animStyle]}>
      {/* Stylized stock chart line using angled Views */}
      <View style={{ width: 80, height: 48, position: 'relative' }}>
        {/* Baseline */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: '#4D7CFF',
            opacity: 0.3,
          }}
        />
        {/* Segment 1: up-left to mid-low */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            bottom: 12,
            width: 20,
            height: 2,
            backgroundColor: '#4D7CFF',
            transform: [{ rotate: '-20deg' }],
          }}
        />
        {/* Segment 2: dip down */}
        <View
          style={{
            position: 'absolute',
            left: 18,
            bottom: 8,
            width: 18,
            height: 2,
            backgroundColor: '#00e5ff',
            transform: [{ rotate: '25deg' }],
          }}
        />
        {/* Segment 3: strong rise */}
        <View
          style={{
            position: 'absolute',
            left: 34,
            bottom: 12,
            width: 22,
            height: 2,
            backgroundColor: '#4D7CFF',
            transform: [{ rotate: '-35deg' }],
          }}
        />
        {/* Segment 4: small dip to end */}
        <View
          style={{
            position: 'absolute',
            left: 54,
            bottom: 28,
            width: 18,
            height: 2,
            backgroundColor: '#00e5ff',
            transform: [{ rotate: '15deg' }],
          }}
        />
        {/* Glow dot at the end */}
        <View
          style={{
            position: 'absolute',
            right: 2,
            bottom: 30,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: '#00e5ff',
          }}
        />
      </View>
    </Animated.View>
  );
}

export function EmptyWatchlist({ onAddPress }: EmptyWatchlistProps) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <NeonChartIcon />
      <Text className="text-text text-lg font-semibold mb-2">新增股票開始追蹤</Text>
      <Text className="text-muted text-sm mb-8 text-center">輸入代號或名稱搜尋</Text>
      <Pressable
        onPress={onAddPress}
        style={{
          borderWidth: 1,
          borderColor: '#4D7CFF',
          borderRadius: 8,
          paddingHorizontal: 24,
          paddingVertical: 12,
          backgroundColor: 'rgba(77, 124, 255, 0.08)',
        }}
      >
        <Text style={{ color: '#4D7CFF', fontWeight: '600', fontSize: 15 }}>新增股票</Text>
      </Pressable>
    </View>
  );
}

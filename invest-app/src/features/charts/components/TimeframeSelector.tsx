import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { TIMEFRAMES, Timeframe } from '../types';

interface TimeframeSelectorProps {
  active: Timeframe;
  onSelect: (tf: Timeframe) => void;
  loading?: boolean;
}

export function TimeframeSelector({ active, onSelect, loading }: TimeframeSelectorProps) {
  const [pillWidth, setPillWidth] = useState(0);
  const translateX = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  function handleLayout(e: LayoutChangeEvent) {
    const containerWidth = e.nativeEvent.layout.width;
    const width = containerWidth / TIMEFRAMES.length;
    setPillWidth(width);
    const activeIndex = TIMEFRAMES.indexOf(active);
    translateX.value = activeIndex * width;
  }

  function handlePress(tf: Timeframe, index: number) {
    translateX.value = withTiming(index * pillWidth, { duration: 200 });
    onSelect(tf);
  }

  return (
    <View
      onLayout={handleLayout}
      style={{
        flexDirection: 'row',
        borderRadius: 999,
        padding: 4,
        position: 'relative',
      }}
      className="bg-surface"
    >
      {pillWidth > 0 && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 4,
              left: 4,
              width: pillWidth,
              bottom: 4,
              borderRadius: 999,
            },
            animatedStyle,
          ]}
          className="bg-primary"
        />
      )}
      {TIMEFRAMES.map((tf, index) => {
        const isActive = tf === active;
        return (
          <Pressable
            key={tf}
            onPress={() => handlePress(tf, index)}
            disabled={loading}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}
          >
            <Text className={isActive ? 'text-bg font-bold text-sm' : 'text-muted text-sm'}>
              {tf}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

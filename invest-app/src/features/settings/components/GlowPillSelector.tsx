import { useState } from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { GlowLevel } from '../store/settingsStore';

const GLOW_LEVELS = ['subtle', 'medium', 'heavy'] as const;
const GLOW_LABELS = ['Subtle', 'Medium', 'Heavy'];

interface GlowPillSelectorProps {
  active: GlowLevel;
  onSelect: (level: GlowLevel) => void;
}

export function GlowPillSelector({ active, onSelect }: GlowPillSelectorProps) {
  const [pillWidth, setPillWidth] = useState(0);
  const translateX = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  function handleLayout(e: LayoutChangeEvent) {
    const containerWidth = e.nativeEvent.layout.width;
    const width = containerWidth / GLOW_LEVELS.length;
    setPillWidth(width);
    const activeIndex = GLOW_LEVELS.indexOf(active);
    translateX.value = activeIndex * width;
  }

  function handlePress(level: GlowLevel, index: number) {
    translateX.value = withTiming(index * pillWidth, { duration: 200 });
    onSelect(level);
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
      {GLOW_LEVELS.map((level, index) => {
        const isActive = level === active;
        return (
          <Pressable
            key={level}
            onPress={() => handlePress(level, index)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}
          >
            <Text className={isActive ? 'text-bg font-bold text-sm' : 'text-muted text-sm'}>
              {GLOW_LABELS[index]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

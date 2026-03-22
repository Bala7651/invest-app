import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { TIMEFRAMES, Timeframe } from '../types';

interface TimeframeSelectorProps {
  active: Timeframe;
  onSelect: (tf: Timeframe) => void;
  loading?: boolean;
}

export function TimeframeSelector({ active, onSelect, loading }: TimeframeSelectorProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        borderRadius: 999,
        padding: 4,
      }}
      className="bg-surface"
    >
      {TIMEFRAMES.map((tf) => {
        const isActive = tf === active;
        return (
          <Pressable
            key={tf}
            onPress={() => onSelect(tf)}
            disabled={loading}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: isActive ? '#4D7CFF' : 'transparent',
            }}
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

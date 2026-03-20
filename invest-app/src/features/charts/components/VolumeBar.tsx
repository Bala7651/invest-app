import React from 'react';
import { View } from 'react-native';
import { OHLCVPoint } from '../types';

interface VolumeBarProps {
  data: OHLCVPoint[];
  height: number;
  width: number;
}

export function VolumeBar({ data, height, width }: VolumeBarProps) {
  if (data.length === 0) {
    return <View style={{ height, width }} />;
  }

  const maxVolume = Math.max(...data.map(d => d.volume));
  const barWidth = width / data.length;
  const gap = 1;

  return (
    <View style={{ height, width, flexDirection: 'row', alignItems: 'flex-end' }}>
      {data.map((point, i) => {
        const barHeight = (point.volume / maxVolume) * height;
        const color = point.close >= point.open ? '#00ff88' : '#ff3366';
        return (
          <View
            key={i}
            style={{
              width: barWidth - gap,
              height: barHeight,
              backgroundColor: color,
              marginRight: gap,
              opacity: 0.7,
            }}
          />
        );
      })}
    </View>
  );
}

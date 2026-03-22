import React from 'react';
import { View } from 'react-native';

interface ChartSkeletonProps {
  height: number;
}

export function ChartSkeleton({ height }: ChartSkeletonProps) {
  return (
    <View style={{ height }}>
      <View
        style={{ flex: 1, borderRadius: 8, backgroundColor: 'rgba(77, 124, 255, 0.12)', opacity: 0.6 }}
      />
    </View>
  );
}

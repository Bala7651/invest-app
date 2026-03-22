import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { OHLCVPoint } from '../types';

interface CandleChartProps {
  data: OHLCVPoint[];
  height: number;
  onCandleChange?: (candle: { open: number; high: number; low: number; close: number } | null) => void;
}

export function CandleChart({ data, height }: CandleChartProps) {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - 32;

  if (data.length < 2) return null;

  const allHighs = data.map(d => d.high);
  const allLows = data.map(d => d.low);
  const maxPrice = Math.max(...allHighs);
  const minPrice = Math.min(...allLows);
  const priceRange = maxPrice - minPrice || 1;

  const candleWidth = chartWidth / data.length;
  const bodyWidth = Math.max(candleWidth * 0.6, 2);
  const wickWidth = Math.max(1, bodyWidth * 0.15);

  function priceToY(price: number): number {
    return ((maxPrice - price) / priceRange) * (height - 8) + 4;
  }

  return (
    <View style={{ width: chartWidth, height, position: 'relative' }}>
      {data.map((point, i) => {
        const isUp = point.close >= point.open;
        const color = isUp ? '#00ff88' : '#ff3366';
        const bodyTop = priceToY(Math.max(point.open, point.close));
        const bodyBottom = priceToY(Math.min(point.open, point.close));
        const bodyHeight = Math.max(bodyBottom - bodyTop, 1);
        const wickTop = priceToY(point.high);
        const wickBottom = priceToY(point.low);
        const wickHeight = wickBottom - wickTop;
        const x = i * candleWidth + (candleWidth - bodyWidth) / 2;
        const wickX = i * candleWidth + candleWidth / 2 - wickWidth / 2;

        return (
          <React.Fragment key={i}>
            <View
              style={{
                position: 'absolute',
                left: wickX,
                top: wickTop,
                width: wickWidth,
                height: wickHeight,
                backgroundColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: x,
                top: bodyTop,
                width: bodyWidth,
                height: bodyHeight,
                backgroundColor: color,
              }}
            />
          </React.Fragment>
        );
      })}
    </View>
  );
}

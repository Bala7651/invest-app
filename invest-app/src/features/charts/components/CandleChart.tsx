import React from 'react';
import { CandlestickChart } from 'react-native-wagmi-charts';
import { OHLCVPoint } from '../types';

interface CandleChartProps {
  data: OHLCVPoint[];
  height: number;
  onCandleChange?: (candle: { open: number; high: number; low: number; close: number } | null) => void;
}

export function CandleChart({ data, height }: CandleChartProps) {
  if (data.length < 2) return null;

  const wagmiData = data.map(({ timestamp, open, high, low, close }) => ({
    timestamp,
    open,
    high,
    low,
    close,
  }));

  return (
    <CandlestickChart.Provider data={wagmiData}>
      <CandlestickChart height={height}>
        <CandlestickChart.Candles
          positiveColor="#00ff88"
          negativeColor="#ff3366"
        />
      </CandlestickChart>
    </CandlestickChart.Provider>
  );
}

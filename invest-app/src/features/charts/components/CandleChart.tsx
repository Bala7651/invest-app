import React from 'react';
import { runOnJS, useAnimatedReaction } from 'react-native-reanimated';
import { CandlestickChart } from 'react-native-wagmi-charts';
import { OHLCVPoint } from '../types';

interface CandleChartProps {
  data: OHLCVPoint[];
  height: number;
  onCandleChange?: (candle: { open: number; high: number; low: number; close: number } | null) => void;
}

interface CandleDataBridgeProps {
  onCandleChange?: (candle: { open: number; high: number; low: number; close: number } | null) => void;
}

function CandleDataBridge({ onCandleChange }: CandleDataBridgeProps) {
  const candleData = CandlestickChart.useCandleData();

  useAnimatedReaction(
    () => candleData.value,
    (candle) => {
      if (!onCandleChange) return;
      if (candle && candle.close !== -1) {
        runOnJS(onCandleChange)({
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        });
      } else {
        runOnJS(onCandleChange)(null);
      }
    },
  );

  return null;
}

export function CandleChart({ data, height, onCandleChange }: CandleChartProps) {
  const wagmiData = data.map(({ timestamp, open, high, low, close }) => ({
    timestamp,
    open,
    high,
    low,
    close,
  }));

  return (
    <CandlestickChart.Provider data={wagmiData}>
      <CandleDataBridge onCandleChange={onCandleChange} />
      <CandlestickChart height={height}>
        <CandlestickChart.Candles
          positiveColor="#00ff88"
          negativeColor="#ff3366"
        />
        <CandlestickChart.Crosshair>
          <CandlestickChart.Tooltip />
        </CandlestickChart.Crosshair>
      </CandlestickChart>
    </CandlestickChart.Provider>
  );
}

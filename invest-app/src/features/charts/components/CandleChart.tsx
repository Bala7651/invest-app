import React, { useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { OHLCVPoint } from '../types';

interface CandleChartProps {
  data: OHLCVPoint[];
  height: number;
  onCandleChange?: (candle: OHLCVPoint | null) => void;
}

const Y_AXIS_WIDTH = 56;
const X_AXIS_HEIGHT = 20;
const GRID_LEVELS = 4;

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function buildMovingAverage(data: OHLCVPoint[], period: number): Array<number | null> {
  let rollingSum = 0;
  return data.map((point, index) => {
    rollingSum += point.close;
    if (index >= period) {
      rollingSum -= data[index - period].close;
    }
    if (index + 1 < period) {
      return null;
    }
    return rollingSum / period;
  });
}

export function CandleChart({ data, height, onCandleChange }: CandleChartProps) {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - 32;
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  if (data.length < 2) return null;

  const plotWidth = chartWidth - Y_AXIS_WIDTH;
  const plotHeight = height - X_AXIS_HEIGHT;

  const allHighs = data.map(d => d.high);
  const allLows = data.map(d => d.low);
  const maxPrice = Math.max(...allHighs);
  const minPrice = Math.min(...allLows);
  const priceRange = maxPrice - minPrice || 1;

  const candleWidth = plotWidth / data.length;
  const bodyWidth = Math.max(candleWidth * 0.6, 2);
  const wickWidth = Math.max(1.5, bodyWidth * 0.18);
  const ma5 = buildMovingAverage(data, 5);
  const ma20 = buildMovingAverage(data, 20);

  function priceToY(price: number): number {
    return ((maxPrice - price) / priceRange) * (plotHeight - 10) + 5;
  }

  // Y-axis grid levels evenly spaced
  const gridPrices = Array.from({ length: GRID_LEVELS }, (_, i) =>
    maxPrice - (priceRange * i) / (GRID_LEVELS - 1)
  );

  // X-axis: show first, middle, last date
  const dateIndices: number[] =
    data.length <= 4
      ? data.map((_, i) => i)
      : [0, Math.floor((data.length - 1) / 2), data.length - 1];

  function handlePress(e: any) {
    const x = e.nativeEvent.locationX;
    const idx = Math.max(0, Math.min(Math.floor(x / candleWidth), data.length - 1));
    setSelectedIdx(idx);
    onCandleChange?.(data[idx]);
  }

  function buildPolylinePoints(series: Array<number | null>): string | null {
    const points = series
      .map((value, index) => {
        if (value == null) return null;
        const x = index * candleWidth + candleWidth / 2;
        const y = priceToY(value);
        return `${x},${y}`;
      })
      .filter((value): value is string => value !== null);

    return points.length >= 2 ? points.join(' ') : null;
  }

  const ma5Points = buildPolylinePoints(ma5);
  const ma20Points = buildPolylinePoints(ma20);

  return (
    <View style={{ width: chartWidth, height }}>
      {/* Plot area */}
      <Pressable
        onPress={handlePress}
        style={{ position: 'absolute', left: 0, top: 0, width: plotWidth, height: plotHeight }}
      >
        <Svg
          width={plotWidth}
          height={plotHeight}
          style={{ position: 'absolute', left: 0, top: 0 }}
          pointerEvents="none"
        >
          {ma5Points ? (
            <Polyline
              points={ma5Points}
              fill="none"
              stroke="#4D7CFF"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
          {ma20Points ? (
            <Polyline
              points={ma20Points}
              fill="none"
              stroke="#F5B800"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
        </Svg>

        {/* Horizontal grid lines */}
        {gridPrices.map((price, i) => {
          const y = priceToY(price);
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: 0,
                top: y,
                width: plotWidth,
                height: 1,
                backgroundColor: 'rgba(255,255,255,0.07)',
              }}
            />
          );
        })}

        {/* Candles */}
        {data.map((point, i) => {
          const isUp = point.close >= point.open;
          const color = isUp ? '#00ff88' : '#ff3366';
          const isSelected = selectedIdx === i;
          const bodyTop = priceToY(Math.max(point.open, point.close));
          const bodyBottom = priceToY(Math.min(point.open, point.close));
          const bodyHeight = Math.max(bodyBottom - bodyTop, 1);
          const wickTop = priceToY(point.high);
          const wickHeight = priceToY(point.low) - wickTop;
          const x = i * candleWidth + (candleWidth - bodyWidth) / 2;
          const wickX = i * candleWidth + candleWidth / 2 - wickWidth / 2;

          return (
            <React.Fragment key={i}>
              {isSelected && (
                <View
                  style={{
                    position: 'absolute',
                    left: i * candleWidth,
                    top: 0,
                    width: candleWidth,
                    height: plotHeight,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                  }}
                />
              )}
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
      </Pressable>

      {(ma5Points || ma20Points) ? (
        <View
          style={{
            position: 'absolute',
            left: 8,
            top: 8,
            flexDirection: 'row',
            gap: 12,
            backgroundColor: 'rgba(5,5,8,0.72)',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 999,
          }}
        >
          {ma5Points ? <Text style={{ color: '#4D7CFF', fontSize: 10, fontWeight: '700' }}>MA5</Text> : null}
          {ma20Points ? <Text style={{ color: '#F5B800', fontSize: 10, fontWeight: '700' }}>MA20</Text> : null}
        </View>
      ) : null}

      {/* Y-axis labels (right side) */}
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: Y_AXIS_WIDTH,
          height: plotHeight,
        }}
      >
        {gridPrices.map((price, i) => {
          const y = priceToY(price);
          return (
            <Text
              key={i}
              style={{
                position: 'absolute',
                right: 4,
                top: y - 7,
                fontSize: 10,
                color: 'rgba(255,255,255,0.38)',
              }}
            >
              {price >= 100 ? price.toFixed(1) : price.toFixed(2)}
            </Text>
          );
        })}
      </View>

      {/* X-axis date labels */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: plotWidth,
          height: X_AXIS_HEIGHT,
        }}
      >
        {dateIndices.map(i => {
          const cx = i * candleWidth + candleWidth / 2;
          return (
            <Text
              key={i}
              style={{
                position: 'absolute',
                left: cx - 20,
                width: 40,
                textAlign: 'center',
                fontSize: 10,
                color: 'rgba(255,255,255,0.35)',
              }}
            >
              {formatDate(data[i].timestamp)}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

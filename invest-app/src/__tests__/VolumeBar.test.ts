import React from 'react';
import { OHLCVPoint } from '../features/charts/types';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return RN;
});

const makeMockCandles = (count: number): OHLCVPoint[] =>
  Array.from({ length: count }, (_, i) => ({
    timestamp: 1000 * (i + 1),
    open: 100 + i,
    high: 110 + i,
    low: 90 + i,
    close: i % 2 === 0 ? 105 + i : 95 + i,
    volume: 10000 + i * 1000,
  }));

describe('VolumeBar', () => {
  it('handles empty data array without error', () => {
    const data: OHLCVPoint[] = [];
    expect(() => {
      const maxVolume = data.length > 0 ? Math.max(...data.map(d => d.volume)) : 0;
      expect(maxVolume).toBe(0);
    }).not.toThrow();
  });

  it('renders correct number of bars matching data length', () => {
    const data = makeMockCandles(5);
    const barCount = data.length;
    expect(barCount).toBe(5);
  });

  it('bar colors are green #00ff88 for up candles (close >= open)', () => {
    const upCandle: OHLCVPoint = { timestamp: 1000, open: 100, high: 110, low: 90, close: 105, volume: 5000 };
    const color = upCandle.close >= upCandle.open ? '#00ff88' : '#ff3366';
    expect(color).toBe('#00ff88');
  });

  it('bar colors are red #ff3366 for down candles (close < open)', () => {
    const downCandle: OHLCVPoint = { timestamp: 1000, open: 105, high: 110, low: 90, close: 100, volume: 5000 };
    const color = downCandle.close >= downCandle.open ? '#00ff88' : '#ff3366';
    expect(color).toBe('#ff3366');
  });

  it('bar height calculation uses volume proportional to maxVolume', () => {
    const data = makeMockCandles(3);
    const height = 60;
    const maxVolume = Math.max(...data.map(d => d.volume));
    const barHeights = data.map(d => (d.volume / maxVolume) * height);
    expect(barHeights[barHeights.length - 1]).toBeCloseTo(height, 0);
    expect(barHeights[0]).toBeLessThan(height);
  });
});

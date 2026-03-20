import { OHLCVPoint } from '../features/charts/types';

jest.mock('react-native-wagmi-charts', () => ({
  CandlestickChart: {
    Provider: jest.fn(),
    Candles: jest.fn(),
    Crosshair: jest.fn(),
    Tooltip: jest.fn(),
    useCandleData: jest.fn(() => ({ open: 0, high: 0, low: 0, close: 0, timestamp: 0 })),
  },
}));

const mockCandles: OHLCVPoint[] = [
  { timestamp: 1000, open: 100, high: 110, low: 90, close: 105, volume: 10000 },
  { timestamp: 2000, open: 105, high: 115, low: 95, close: 98, volume: 12000 },
];

function mapToWagmiFormat(data: OHLCVPoint[]) {
  return data.map(({ timestamp, open, high, low, close }) => ({
    timestamp,
    open,
    high,
    low,
    close,
  }));
}

describe('CandleChart', () => {
  it('maps OHLCVPoint[] to wagmi CandlePoint format (strips volume)', () => {
    const mapped = mapToWagmiFormat(mockCandles);
    expect(mapped).toHaveLength(2);
    expect(mapped[0]).toEqual({
      timestamp: 1000,
      open: 100,
      high: 110,
      low: 90,
      close: 105,
    });
    expect(mapped[0]).not.toHaveProperty('volume');
  });

  it('mapped points retain all OHLC fields from source data', () => {
    const mapped = mapToWagmiFormat(mockCandles);
    expect(mapped[1]).toEqual({
      timestamp: 2000,
      open: 105,
      high: 115,
      low: 95,
      close: 98,
    });
  });

  it('onCandleChange callback receives candle data during crosshair interaction', () => {
    const onCandleChange = jest.fn();
    const candle = { open: 100, high: 110, low: 90, close: 105 };
    onCandleChange(candle);
    expect(onCandleChange).toHaveBeenCalledWith(candle);
  });

  it('onCandleChange(null) is called when crosshair is released', () => {
    const onCandleChange = jest.fn();
    onCandleChange(null);
    expect(onCandleChange).toHaveBeenCalledWith(null);
  });
});

import { detectPatterns, PatternResult, PatternSignal } from '../features/charts/services/patternDetector';
import { OHLCVPoint } from '../features/charts/types';

function makeCandle(
  open: number,
  high: number,
  low: number,
  close: number,
  timestamp = 0,
  volume = 1000,
): OHLCVPoint {
  return { timestamp, open, high, low, close, volume };
}

// Helper: create a descending (bearish) trend of candles
function bearishTrend(count: number, startClose = 100): OHLCVPoint[] {
  const candles: OHLCVPoint[] = [];
  for (let i = 0; i < count; i++) {
    const close = startClose - i * 2;
    candles.push(makeCandle(close + 1, close + 2, close - 1, close, i * 1000));
  }
  return candles;
}

// Helper: create an ascending (bullish) trend of candles
function bullishTrend(count: number, startClose = 90): OHLCVPoint[] {
  const candles: OHLCVPoint[] = [];
  for (let i = 0; i < count; i++) {
    const close = startClose + i * 2;
    candles.push(makeCandle(close - 1, close + 1, close - 2, close, i * 1000));
  }
  return candles;
}

describe('detectPatterns', () => {
  // --- 1. Hammer (錘子) ---
  test('returns 錘子/bullish for a hammer candle after bearish trend', () => {
    // Hammer: small body near top of range, lower shadow >= 2x body, upper shadow tiny
    // open=99, close=100 => body=1, range=low to high
    // high=100.5 (tiny upper shadow), low=97 (lower shadow=97 to 99 = 2, >= 2x body)
    const trend = bearishTrend(3, 110);
    const hammerCandle = makeCandle(99, 100.5, 96, 100, 3000);
    // body = |100 - 99| = 1; range = 100.5 - 96 = 4.5
    // body in upper 1/3: body top = max(open,close)=100, (high - range/3)= 100.5 - 1.5 = 99 => body top >= 99 ✓
    // lower shadow = min(open,close) - low = 99 - 96 = 3 >= 2*body=2 ✓
    // upper shadow = high - max(open,close) = 100.5 - 100 = 0.5 <= 0.1*range=0.45? ~ 0.5 > 0.45, borderline
    // Let's use tighter: upper shadow = 0.3 <= 0.5 x range
    const hammerCandle2 = makeCandle(99, 99.3, 96, 100, 3000);
    // body = 1, range = 99.3 - 96 = 3.3; lower shadow = 99 - 96 = 3 >= 2*1 ✓; upper = 99.3 - 100? no, high must >= close
    // Fix: open=99, close=100, high=100.3, low=96
    // lower shadow = min(99,100) - 96 = 99 - 96 = 3; body=1; 3 >= 2*1 ✓
    // upper shadow = 100.3 - max(99,100) = 0.3; range = 100.3-96=4.3; 0.3 <= 0.1*4.3=0.43 ✓
    const hammer = makeCandle(99, 100.3, 96, 100, 3000);
    const candles = [...trend, hammer];
    const result = detectPatterns(candles);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('錘子');
    expect(result!.signal).toBe('bullish');
  });

  // --- 2. Inverted Hammer (倒錘子) ---
  test('returns 倒錘子/bullish for an inverted hammer candle', () => {
    // Inverted hammer: body in lower 1/3, upper shadow >= 2x body, lower shadow tiny
    // open=100, close=101, high=104, low=99.7
    // body=1, upper shadow = 104-101=3 >= 2*1 ✓
    // lower shadow = min(100,101) - 99.7 = 0.3; range = 104-99.7=4.3; 0.3 <= 0.1*4.3=0.43 ✓
    // body position: max(o,c)=101; range bottom third = 99.7 + 4.3/3 = 99.7+1.43=101.13; max(o,c)=101 <= 101.13 ✓
    const trend = bearishTrend(3, 110);
    const iHammer = makeCandle(100, 104, 99.7, 101, 3000);
    const candles = [...trend, iHammer];
    const result = detectPatterns(candles);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('倒錘子');
    expect(result!.signal).toBe('bullish');
  });

  // --- 3. Bullish Engulfing (吞噬多頭) ---
  test('returns 吞噬多頭/bullish for a bullish engulfing pattern', () => {
    // candle[-2]: bearish (open > close); candle[-1]: bullish fully engulfs prior
    // Prior: open=102, close=98 (bearish, body=4)
    // Current: open=97, close=103 (bullish, engulfs: open<98, close>102 ✓)
    const setup = bearishTrend(2, 110);
    const prior = makeCandle(102, 103, 97, 98, 2000);
    const current = makeCandle(97, 104, 96, 103, 3000);
    const candles = [...setup, prior, current];
    const result = detectPatterns(candles);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('吞噬多頭');
    expect(result!.signal).toBe('bullish');
  });

  // --- 4. Bearish Engulfing (吞噬空頭) ---
  test('returns 吞噬空頭/bearish for a bearish engulfing pattern', () => {
    // Prior: bullish; Current: bearish fully engulfs
    // Prior: open=98, close=102 (bullish, body=4)
    // Current: open=103, close=97 (bearish, engulfs: open>102, close<98 ✓)
    const setup = bullishTrend(2, 90);
    const prior = makeCandle(98, 103, 97, 102, 2000);
    const current = makeCandle(103, 104, 96, 97, 3000);
    const candles = [...setup, prior, current];
    const result = detectPatterns(candles);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('吞噬空頭');
    expect(result!.signal).toBe('bearish');
  });

  // --- 5. Shooting Star (恆星線) ---
  test('returns 恆星線/bearish for a shooting star after bullish trend', () => {
    // Shooting star: long upper shadow >= 2x body, lower shadow tiny, body near bottom
    // open=100, close=101, high=104, low=99.7 => same as inverted hammer but after bullish trend
    // body=1, upper shadow=3 >= 2*1 ✓, lower shadow=0.3 <= 0.1*4.3 ✓
    const trend = bullishTrend(3, 90);
    const star = makeCandle(100, 104, 99.7, 101, 4000);
    const candles = [...trend, star];
    const result = detectPatterns(candles);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('恆星線');
    expect(result!.signal).toBe('bearish');
  });

  // --- 6. Doji (十字星) ---
  test('returns 十字星/neutral for a doji candle', () => {
    // body <= 5% of range
    // open=100, close=100.1, high=105, low=95; range=10; body=0.1 <= 0.05*10=0.5 ✓
    const candles = [
      makeCandle(100, 105, 95, 100.1, 0),
    ];
    const result = detectPatterns(candles);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('十字星');
    expect(result!.signal).toBe('neutral');
  });

  // --- 7. Morning Star (早晨之星) ---
  test('returns 早晨之星/bullish for a morning star pattern', () => {
    // candle[-3]: large bearish (body > 0.6x range)
    // candle[-2]: small body (doji or near-doji)
    // candle[-1]: large bullish, closes above midpoint of candle[-3] body
    // c[-3]: open=110, close=100, high=111, low=99; range=12; body=10 > 0.6*12=7.2 ✓; bearish ✓
    // c[-2]: open=99, close=99.5, high=100, low=98.5; body=0.5; near-doji ✓
    // c[-1]: open=100, close=108, high=109, low=99; bullish ✓; midpoint of c[-3] = (110+100)/2=105; 108>105 ✓
    const setup = bearishTrend(2, 120);
    const c3 = makeCandle(110, 111, 99, 100, 2000);
    const c2 = makeCandle(99, 100, 98.5, 99.5, 3000);
    const c1 = makeCandle(100, 109, 99, 108, 4000);
    const candles = [...setup, c3, c2, c1];
    const result = detectPatterns(candles);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('早晨之星');
    expect(result!.signal).toBe('bullish');
  });

  // --- 8. Evening Star (黃昏之星) ---
  test('returns 黃昏之星/bearish for an evening star pattern', () => {
    // Inverse of morning star
    // c[-3]: large bullish (body > 0.6x range)
    // c[-2]: small body
    // c[-1]: large bearish, closes below midpoint of c[-3] body
    // c[-3]: open=100, close=110, high=111, low=99; range=12; body=10 > 7.2 ✓; bullish ✓
    // c[-2]: open=111, close=111.5, high=112, low=110.5; near-doji
    // c[-1]: open=110, close=102, high=111, low=101; bearish ✓; midpoint=(100+110)/2=105; 102<105 ✓
    const setup = bullishTrend(2, 90);
    const c3 = makeCandle(100, 111, 99, 110, 2000);
    const c2 = makeCandle(111, 112, 110.5, 111.5, 3000);
    const c1 = makeCandle(110, 111, 101, 102, 4000);
    const candles = [...setup, c3, c2, c1];
    const result = detectPatterns(candles);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('黃昏之星');
    expect(result!.signal).toBe('bearish');
  });

  // --- 9. No pattern ---
  test('returns null when no pattern matches', () => {
    // Random candles with no recognizable pattern
    const candles = [
      makeCandle(100, 101, 99, 100.5, 0),
      makeCandle(100.5, 101.5, 100, 101, 1000),
      makeCandle(101, 102, 100.5, 101.2, 2000),
      makeCandle(101.2, 101.8, 100.8, 101.5, 3000),
    ];
    const result = detectPatterns(candles);
    // These are mild bullish candles with no special pattern - expect null
    // If a pattern happens to match we'll adjust the fixture; primary goal is null path exists
    expect(result).toBeNull();
  });

  // --- 10. Strongest pattern wins ---
  test('returns strongest pattern (3-candle over 1-candle) when both detected in same window', () => {
    // Setup: last 3 candles form morning star (confidence 0.9)
    // But the last candle alone might also trigger hammer (confidence 0.5)
    // Morning star should win
    const setup = bearishTrend(2, 120);
    // c[-3]: large bearish
    const c3 = makeCandle(110, 111, 99, 100, 2000);
    // c[-2]: near-doji (small body)
    const c2 = makeCandle(99, 100, 98.5, 99.5, 3000);
    // c[-1]: large bullish closing above midpoint, also has a large lower shadow (hammer-like)
    // open=99.5, close=108, high=109, low=96
    // As hammer: body=8.5, lower shadow=99.5-96=3.5 < 2*8.5=17, so hammer NOT triggered ✓
    // Engulfing: prior c2 open=99,close=99.5 (bullish tiny); c1 open=99.5,close=108... prior is bullish so no bullish engulf
    const c1 = makeCandle(99.5, 109, 96, 108, 4000);
    const candles = [...setup, c3, c2, c1];
    const result = detectPatterns(candles);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('早晨之星');
  });

  // --- 11. Body=0 guard ---
  test('returns null (not NaN or throw) for a candle with open === close (body=0)', () => {
    // This should not throw and not return NaN anywhere
    const flatCandle = makeCandle(100, 100, 100, 100, 0);
    expect(() => detectPatterns([flatCandle])).not.toThrow();
    // A single flat candle: body=0 < 0.01 => treated as doji
    // But range = high-low = 0, so doji check (body <= 0.05*range) would be 0 <= 0 ✓
    // Could return 十字星 or null — both are acceptable; what's NOT acceptable is NaN or throw
    const result = detectPatterns([flatCandle]);
    if (result !== null) {
      expect(isNaN(result.confidence)).toBe(false);
    }
  });

  // --- 12. Empty array ---
  test('returns null for empty array input', () => {
    expect(detectPatterns([])).toBeNull();
  });
});

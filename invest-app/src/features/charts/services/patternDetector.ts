import { OHLCVPoint } from '../types';

export type PatternSignal = 'bullish' | 'neutral' | 'bearish';

export interface PatternResult {
  name: string;
  explanation: string;
  signal: PatternSignal;
  confidence: number;
}

const PATTERN_DEFS: Record<string, Omit<PatternResult, 'confidence'>> = {
  morning_star: {
    name: '早晨之星',
    explanation: '三根K線底部反轉：大陰線、小實體、大陽線，強烈看漲訊號。',
    signal: 'bullish',
  },
  evening_star: {
    name: '黃昏之星',
    explanation: '三根K線頂部反轉：大陽線、小實體、大陰線，強烈看跌訊號。',
    signal: 'bearish',
  },
  bullish_engulfing: {
    name: '吞噬多頭',
    explanation: '陽線完全吞噬前一根陰線，買盤強勁，看漲反轉訊號。',
    signal: 'bullish',
  },
  bearish_engulfing: {
    name: '吞噬空頭',
    explanation: '陰線完全吞噬前一根陽線，賣壓湧現，看跌反轉訊號。',
    signal: 'bearish',
  },
  hammer: {
    name: '錘子',
    explanation: '下影線長度是實體的兩倍以上，顯示強力支撐，看漲訊號。',
    signal: 'bullish',
  },
  inverted_hammer: {
    name: '倒錘子',
    explanation: '上影線長度是實體的兩倍以上，潛在反轉訊號，需次日確認。',
    signal: 'bullish',
  },
  shooting_star: {
    name: '恆星線',
    explanation: '上影線極長、實體極小，頂部反轉形態，看跌訊號。',
    signal: 'bearish',
  },
  doji: {
    name: '十字星',
    explanation: '開盤與收盤幾乎相同，市場猶豫不決，需觀察後續走向。',
    signal: 'neutral',
  },
};

// Helper: check if the last N closes form a descending (bearish) trend
function isBearishTrend(candles: OHLCVPoint[], lookback = 3): boolean {
  if (candles.length < lookback) return false;
  const slice = candles.slice(-lookback);
  for (let i = 1; i < slice.length; i++) {
    if (slice[i].close >= slice[i - 1].close) return false;
  }
  return true;
}

// Helper: check if the last N closes form an ascending (bullish) trend
function isBullishTrend(candles: OHLCVPoint[], lookback = 3): boolean {
  if (candles.length < lookback) return false;
  const slice = candles.slice(-lookback);
  for (let i = 1; i < slice.length; i++) {
    if (slice[i].close <= slice[i - 1].close) return false;
  }
  return true;
}

function checkHammer(candles: OHLCVPoint[]): number {
  if (candles.length < 4) return 0;
  const c = candles[candles.length - 1];
  const range = c.high - c.low;
  if (range < 0.01) return 0;

  const body = Math.abs(c.close - c.open);
  // Body=0 guard: treat as doji, not hammer
  if (body < 0.01) return 0;

  const upperShadow = c.high - Math.max(c.open, c.close);
  const lowerShadow = Math.min(c.open, c.close) - c.low;

  // Body must be in upper 1/3 of range
  const bodyTop = Math.max(c.open, c.close);
  if (bodyTop < c.low + (2 / 3) * range) return 0;

  // Lower shadow >= 2x body
  if (lowerShadow < 2 * body) return 0;

  // Upper shadow <= 10% of range
  if (upperShadow > 0.1 * range) return 0;

  // Prior trend must be bearish (check the candles before the last one)
  if (!isBearishTrend(candles.slice(0, -1), 3)) return 0;

  return 0.5;
}

function checkInvertedHammer(candles: OHLCVPoint[]): number {
  if (candles.length < 1) return 0;
  const c = candles[candles.length - 1];
  const range = c.high - c.low;
  if (range < 0.01) return 0;

  const body = Math.abs(c.close - c.open);
  if (body < 0.01) return 0;

  const upperShadow = c.high - Math.max(c.open, c.close);
  const lowerShadow = Math.min(c.open, c.close) - c.low;

  // Body must be in lower 1/3 of range
  const bodyTop = Math.max(c.open, c.close);
  if (bodyTop > c.low + (1 / 3) * range) return 0;

  // Upper shadow >= 2x body
  if (upperShadow < 2 * body) return 0;

  // Lower shadow <= 10% of range
  if (lowerShadow > 0.1 * range) return 0;

  return 0.5;
}

function checkBullishEngulfing(candles: OHLCVPoint[]): number {
  if (candles.length < 2) return 0;
  const prev = candles[candles.length - 2];
  const curr = candles[candles.length - 1];

  // Prior candle must be bearish
  if (prev.close >= prev.open) return 0;
  // Current candle must be bullish
  if (curr.close <= curr.open) return 0;

  // Current engulfs prior: current open < prior close AND current close > prior open
  if (curr.open >= prev.close) return 0;
  if (curr.close <= prev.open) return 0;

  return 0.7;
}

function checkBearishEngulfing(candles: OHLCVPoint[]): number {
  if (candles.length < 2) return 0;
  const prev = candles[candles.length - 2];
  const curr = candles[candles.length - 1];

  // Prior candle must be bullish
  if (prev.close <= prev.open) return 0;
  // Current candle must be bearish
  if (curr.close >= curr.open) return 0;

  // Current engulfs prior: current open > prior close AND current close < prior open
  if (curr.open <= prev.close) return 0;
  if (curr.close >= prev.open) return 0;

  return 0.7;
}

function checkShootingStar(candles: OHLCVPoint[]): number {
  if (candles.length < 4) return 0;
  const c = candles[candles.length - 1];
  const range = c.high - c.low;
  if (range < 0.01) return 0;

  const body = Math.abs(c.close - c.open);
  if (body < 0.01) return 0;

  const upperShadow = c.high - Math.max(c.open, c.close);
  const lowerShadow = Math.min(c.open, c.close) - c.low;

  // Body must be in lower 1/3 of range (same as inverted hammer but after bullish trend)
  const bodyTop = Math.max(c.open, c.close);
  if (bodyTop > c.low + (1 / 3) * range) return 0;

  // Upper shadow >= 2x body
  if (upperShadow < 2 * body) return 0;

  // Lower shadow <= 10% of range
  if (lowerShadow > 0.1 * range) return 0;

  // Prior trend must be bullish
  if (!isBullishTrend(candles.slice(0, -1), 3)) return 0;

  return 0.5;
}

function checkDoji(candles: OHLCVPoint[]): number {
  if (candles.length < 1) return 0;
  const c = candles[candles.length - 1];
  const range = c.high - c.low;
  if (range < 0.01) return 0;

  const body = Math.abs(c.close - c.open);

  // Body <= 5% of range
  if (body > 0.05 * range) return 0;

  return 0.3;
}

function checkMorningStar(candles: OHLCVPoint[]): number {
  if (candles.length < 3) return 0;
  const c1 = candles[candles.length - 3]; // large bearish
  const c2 = candles[candles.length - 2]; // small body
  const c3 = candles[candles.length - 1]; // large bullish

  // c1 must be bearish and large body (>0.6x range)
  if (c1.close >= c1.open) return 0;
  const c1Range = c1.high - c1.low;
  if (c1Range < 0.01) return 0;
  const c1Body = Math.abs(c1.close - c1.open);
  if (c1Body < 0.6 * c1Range) return 0;

  // c2 must be small body (near-doji: body <= 30% of c1 body)
  const c2Body = Math.abs(c2.close - c2.open);
  if (c2Body > 0.3 * c1Body) return 0;

  // c3 must be bullish
  if (c3.close <= c3.open) return 0;

  // c3 closes above midpoint of c1 body
  const c1Midpoint = (c1.open + c1.close) / 2;
  if (c3.close <= c1Midpoint) return 0;

  return 0.9;
}

function checkEveningStar(candles: OHLCVPoint[]): number {
  if (candles.length < 3) return 0;
  const c1 = candles[candles.length - 3]; // large bullish
  const c2 = candles[candles.length - 2]; // small body
  const c3 = candles[candles.length - 1]; // large bearish

  // c1 must be bullish and large body (>0.6x range)
  if (c1.close <= c1.open) return 0;
  const c1Range = c1.high - c1.low;
  if (c1Range < 0.01) return 0;
  const c1Body = Math.abs(c1.close - c1.open);
  if (c1Body < 0.6 * c1Range) return 0;

  // c2 must be small body
  const c2Body = Math.abs(c2.close - c2.open);
  if (c2Body > 0.3 * c1Body) return 0;

  // c3 must be bearish
  if (c3.close >= c3.open) return 0;

  // c3 closes below midpoint of c1 body
  const c1Midpoint = (c1.open + c1.close) / 2;
  if (c3.close >= c1Midpoint) return 0;

  return 0.9;
}

export function detectPatterns(candles: OHLCVPoint[]): PatternResult | null {
  if (!candles || candles.length === 0) return null;

  const candidates: PatternResult[] = [];

  const checks: Array<[string, () => number]> = [
    ['morning_star', () => checkMorningStar(candles)],
    ['evening_star', () => checkEveningStar(candles)],
    ['bullish_engulfing', () => checkBullishEngulfing(candles)],
    ['bearish_engulfing', () => checkBearishEngulfing(candles)],
    ['hammer', () => checkHammer(candles)],
    ['shooting_star', () => checkShootingStar(candles)],
    ['inverted_hammer', () => checkInvertedHammer(candles)],
    ['doji', () => checkDoji(candles)],
  ];

  for (const [key, check] of checks) {
    const confidence = check();
    if (confidence > 0) {
      candidates.push({ ...PATTERN_DEFS[key], confidence });
    }
  }

  if (candidates.length === 0) return null;

  // Return highest confidence; ties go to the first match in the checks order
  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates[0];
}

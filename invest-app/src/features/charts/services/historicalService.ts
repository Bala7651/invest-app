import { ChartProvider, OHLCVPoint, SelectableChartProvider, Timeframe } from '../types';
import { useSettingsStore } from '../../settings/store/settingsStore';

function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

export function twseDateToTimestamp(twseDate: string): number {
  const parts = twseDate.split('/');
  const year = parseInt(parts[0], 10) + 1911;
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  return new Date(year, month - 1, day).getTime();
}

function parseCommaNumber(s: string): number {
  return parseFloat(s.replace(/,/g, ''));
}

interface FugleIntradayCandlesResponse {
  data?: Array<{
    date?: string;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume?: number;
  }>;
}

interface YahooIntradayChartResponse {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
}

export interface ChartFetchResult {
  points: OHLCVPoint[];
  providerUsed: SelectableChartProvider;
}

function bucketCandles(points: OHLCVPoint[], minutes: number): OHLCVPoint[] {
  if (points.length === 0) return points;

  const bucketMs = minutes * 60_000;
  const buckets = new Map<number, OHLCVPoint>();

  for (const point of [...points].sort((a, b) => a.timestamp - b.timestamp)) {
    const bucketTs = Math.floor(point.timestamp / bucketMs) * bucketMs;
    const existing = buckets.get(bucketTs);
    if (!existing) {
      buckets.set(bucketTs, { ...point, timestamp: bucketTs });
      continue;
    }

    existing.high = Math.max(existing.high, point.high);
    existing.low = Math.min(existing.low, point.low);
    existing.close = point.close;
    existing.volume += point.volume;
  }

  return Array.from(buckets.values()).sort((a, b) => a.timestamp - b.timestamp);
}

async function fetchFugleIntradayCandles(symbol: string): Promise<OHLCVPoint[]> {
  const { fugleApiKey, fugleEnabled } = useSettingsStore.getState();
  if (!fugleEnabled || !fugleApiKey) return [];

  const url = `https://api.fugle.tw/marketdata/v1.0/stock/intraday/candles/${encodeURIComponent(symbol)}?timeframe=1&sort=asc`;
  const res = await fetch(url, {
    headers: {
      'X-API-KEY': fugleApiKey,
      'User-Agent': 'invest-app/1.0',
    },
    signal: timeoutSignal(6_000),
  });
  if (!res.ok) throw new Error(`Fugle HTTP ${res.status}`);
  const data = await res.json() as FugleIntradayCandlesResponse;
  if (!Array.isArray(data.data)) return [];

  return data.data
    .filter((row) =>
      typeof row.date === 'string' &&
      typeof row.open === 'number' &&
      typeof row.high === 'number' &&
      typeof row.low === 'number' &&
      typeof row.close === 'number'
    )
    .map((row): OHLCVPoint => ({
      timestamp: new Date(row.date as string).getTime(),
      open: row.open as number,
      high: row.high as number,
      low: row.low as number,
      close: row.close as number,
      volume: typeof row.volume === 'number' ? row.volume : 0,
    }));
}

async function fetchYahooIntradayCandles(symbol: string): Promise<OHLCVPoint[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(`${symbol}.TW`)}?interval=5m&range=1d&includePrePost=false`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: timeoutSignal(6_000),
  });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
  const data = await res.json() as YahooIntradayChartResponse;
  const result = data.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];
  const opens = quote?.open ?? [];
  const highs = quote?.high ?? [];
  const lows = quote?.low ?? [];
  const closes = quote?.close ?? [];
  const volumes = quote?.volume ?? [];

  return timestamps
    .map((timestamp, index): OHLCVPoint | null => {
      const open = opens[index];
      const high = highs[index];
      const low = lows[index];
      const close = closes[index];
      if (
        typeof timestamp !== 'number' ||
        typeof open !== 'number' ||
        typeof high !== 'number' ||
        typeof low !== 'number' ||
        typeof close !== 'number'
      ) {
        return null;
      }

      return {
        timestamp: timestamp * 1000,
        open,
        high,
        low,
        close,
        volume: typeof volumes[index] === 'number' ? (volumes[index] as number) : 0,
      };
    })
    .filter((point): point is OHLCVPoint => point !== null);
}

async function fetchFinMindDaily(stockId: string, startDate: string): Promise<OHLCVPoint[]> {
  const url = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${stockId}&start_date=${startDate}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'invest-app/1.0' },
    signal: timeoutSignal(6_000),
  });
  if (!res.ok) throw new Error(`FinMind HTTP ${res.status}`);
  const data = await res.json();
  if (!data.data || !Array.isArray(data.data)) return [];
  return data.data.map((row: any): OHLCVPoint => ({
    timestamp: new Date(row.date).getTime(),
    open: row.open,
    high: row.max,
    low: row.min,
    close: row.close,
    volume: row.Trading_Volume,
  }));
}

async function fetchTWSEMonthly(stockId: string, year: number, month: number): Promise<OHLCVPoint[]> {
  const mm = String(month).padStart(2, '0');
  const url = `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${year}${mm}01&stockNo=${stockId}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'invest-app/1.0' },
    signal: timeoutSignal(6_000),
  });
  if (!res.ok) throw new Error(`TWSE HTTP ${res.status}`);
  const data = await res.json();
  if (!data.data || !Array.isArray(data.data)) return [];
  return data.data.map((row: string[]): OHLCVPoint => ({
    timestamp: twseDateToTimestamp(row[0]),
    open: parseCommaNumber(row[3]),
    high: parseCommaNumber(row[4]),
    low: parseCommaNumber(row[5]),
    close: parseCommaNumber(row[6]),
    volume: parseCommaNumber(row[1]),
  }));
}

export function getDateRange(timeframe: Timeframe): string {
  const now = new Date();
  let start: Date;
  switch (timeframe) {
    case '1D':
      start = new Date(now);
      start.setDate(now.getDate() - 1);
      break;
    case '5D':
      start = new Date(now);
      start.setDate(now.getDate() - 7);
      break;
    case '1M':
      start = new Date(now);
      start.setMonth(now.getMonth() - 1);
      break;
    case '6M':
      start = new Date(now);
      start.setMonth(now.getMonth() - 6);
      break;
    case '1Y':
      start = new Date(now);
      start.setFullYear(now.getFullYear() - 1);
      break;
  }
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, '0');
  const d = String(start.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getAvailableChartProviders(timeframe: Timeframe): SelectableChartProvider[] {
  if (timeframe === '1D') {
    return ['fugle', 'twse', 'yahoo'];
  }
  return ['twse'];
}

// Fetch all months in parallel — no queue needed
async function fetchTWSERange(stockId: string, startDate: string): Promise<OHLCVPoint[]> {
  const start = new Date(startDate);
  const now = new Date();
  const months: Array<{ year: number; month: number }> = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= now) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() + 1 });
    cur.setMonth(cur.getMonth() + 1);
  }
  const results = await Promise.all(
    months.map(({ year, month }) =>
      fetchTWSEMonthly(stockId, year, month).catch(() => [] as OHLCVPoint[])
    )
  );
  return results.flat().filter(p => p.timestamp >= start.getTime());
}

export async function fetchCandles(
  symbol: string,
  timeframe: Timeframe,
  provider: ChartProvider = 'auto',
): Promise<ChartFetchResult> {
  const startDate = getDateRange(timeframe);
  let points: OHLCVPoint[] = [];
  const availableProviders = getAvailableChartProviders(timeframe);
  const requestedProvider =
    provider === 'auto'
      ? null
      : availableProviders.includes(provider)
        ? provider
        : availableProviders[0];

  if (timeframe === '1D' && requestedProvider === 'fugle') {
    points = bucketCandles(await fetchFugleIntradayCandles(symbol), 5);
    return { points, providerUsed: 'fugle' };
  }

  if (timeframe === '1D' && requestedProvider === 'yahoo') {
    points = await fetchYahooIntradayCandles(symbol);
    return { points, providerUsed: 'yahoo' };
  }

  if (timeframe === '1D' && provider === 'auto') {
    try {
      points = bucketCandles(await fetchFugleIntradayCandles(symbol), 5);
      if (points.length >= 2) {
        return { points, providerUsed: 'fugle' };
      }
    } catch {
      points = [];
    }
  }

  if (timeframe === '1M' || timeframe === '6M' || timeframe === '1Y') {
    // Try FinMind first (single fast request), fall back to parallel TWSE
    try {
      points = await fetchFinMindDaily(symbol, startDate);
    } catch {
      points = [];
    }
    if (points.length === 0) {
      points = await fetchTWSERange(symbol, startDate);
    }
  } else {
    // 1D and 5D: fetch current + previous month in parallel
    const now = new Date();
    const prevDate = new Date(now);
    prevDate.setMonth(prevDate.getMonth() - 1);

    const [currentMonthPoints, prevMonthPoints] = await Promise.all([
      fetchTWSEMonthly(symbol, now.getFullYear(), now.getMonth() + 1).catch(() => [] as OHLCVPoint[]),
      fetchTWSEMonthly(symbol, prevDate.getFullYear(), prevDate.getMonth() + 1).catch(() => [] as OHLCVPoint[]),
    ]);
    points = [...prevMonthPoints, ...currentMonthPoints];

    if (timeframe === '5D') {
      points = points.slice(-5);
    } else {
      points = points.slice(-2);
    }
  }

  return {
    points: points.sort((a, b) => a.timestamp - b.timestamp),
    providerUsed: 'twse',
  };
}

import { OHLCVPoint, Timeframe } from '../types';

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

export async function fetchCandles(symbol: string, timeframe: Timeframe): Promise<OHLCVPoint[]> {
  const startDate = getDateRange(timeframe);
  let points: OHLCVPoint[] = [];

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

  return points.sort((a, b) => a.timestamp - b.timestamp);
}

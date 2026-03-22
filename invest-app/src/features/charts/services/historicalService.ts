import { OHLCVPoint, Timeframe } from '../types';

class RequestQueue {
  private running = false;
  private queue: Array<() => Promise<void>> = [];
  private lastRequestTime = 0;

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        const elapsed = Date.now() - this.lastRequestTime;
        const wait = Math.max(0, 3000 - elapsed);
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
        try {
          this.lastRequestTime = Date.now();
          resolve(await fn());
        } catch (e) {
          reject(e);
        }
      });
      if (!this.running) this._drain();
    });
  }

  private async _drain() {
    this.running = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      await task();
    }
    this.running = false;
  }
}

const _queue = new RequestQueue();

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

function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

async function fetchFinMindDaily(stockId: string, startDate: string): Promise<OHLCVPoint[]> {
  const url = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${stockId}&start_date=${startDate}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'invest-app/1.0' },
    signal: timeoutSignal(10_000),
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
    signal: timeoutSignal(10_000),
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

async function fetchTWSERange(stockId: string, startDate: string): Promise<OHLCVPoint[]> {
  const start = new Date(startDate);
  const now = new Date();
  const months: Array<{ year: number; month: number }> = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= now) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() + 1 });
    cur.setMonth(cur.getMonth() + 1);
  }
  const results: OHLCVPoint[] = [];
  for (const { year, month } of months) {
    const points = await _queue.enqueue(() => fetchTWSEMonthly(stockId, year, month));
    results.push(...points);
  }
  return results.filter(p => p.timestamp >= start.getTime());
}

export async function fetchCandles(symbol: string, timeframe: Timeframe): Promise<OHLCVPoint[]> {
  const startDate = getDateRange(timeframe);
  let points: OHLCVPoint[] = [];

  if (timeframe === '1M' || timeframe === '6M' || timeframe === '1Y') {
    try {
      points = await _queue.enqueue(() => fetchFinMindDaily(symbol, startDate));
    } catch {
      points = [];
    }
    if (points.length === 0) {
      points = await fetchTWSERange(symbol, startDate);
    }
  } else {
    // 1D and 5D: use TWSE STOCK_DAY daily candles
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const prevDate = new Date(now);
    prevDate.setMonth(prevDate.getMonth() - 1);

    const currentMonthPoints = await _queue.enqueue(() =>
      fetchTWSEMonthly(symbol, currentYear, currentMonth)
    );
    points = [...currentMonthPoints];

    if ((timeframe === '5D' || timeframe === '1D') && points.length < 5) {
      const prevPoints = await _queue.enqueue(() =>
        fetchTWSEMonthly(symbol, prevDate.getFullYear(), prevDate.getMonth() + 1)
      );
      points = [...prevPoints, ...points];
    }

    if (timeframe === '5D') {
      points = points.slice(-5);
    } else {
      points = points.slice(-2);
    }
  }

  return points.sort((a, b) => a.timestamp - b.timestamp);
}

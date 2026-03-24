export interface TWSEQuote {
  symbol: string;
  name: string;
  price: number | null;
  prevClose: number;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number;
  updatedAt: number;
}

interface YahooChartMeta {
  symbol?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  previousClose?: number;
  chartPreviousClose?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  regularMarketTime?: number;
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: YahooChartMeta;
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
        }>;
      };
    }>;
  };
}

const YAHOO_CACHE_TTL_MS = 60_000;
const yahooFallbackCache = new Map<string, { quote: TWSEQuote; fetchedAt: number }>();

export function parseSentinel(val: string): number | null {
  if (val === '-' || val === '') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function parseNumber(val: unknown): number | null {
  return typeof val === 'number' && Number.isFinite(val) ? val : null;
}

function lastNumber(values: Array<number | null> | undefined): number | null {
  if (!Array.isArray(values)) return null;
  for (let i = values.length - 1; i >= 0; i--) {
    const value = values[i];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function getCachedYahooQuote(symbol: string, now = Date.now()): TWSEQuote | null {
  const cached = yahooFallbackCache.get(symbol);
  if (!cached) return null;
  if (now - cached.fetchedAt > YAHOO_CACHE_TTL_MS) {
    yahooFallbackCache.delete(symbol);
    return null;
  }
  return cached.quote;
}

async function fetchYahooQuote(symbol: string): Promise<TWSEQuote | null> {
  const cached = getCachedYahooQuote(symbol);
  if (cached) return cached;

  const yahooSymbol = `${symbol}.TW`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1m&range=1d&includePrePost=false`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;

    const data: YahooChartResponse = await res.json();
    const result = data.chart?.result?.[0];
    const meta = result?.meta;
    const quote = result?.indicators?.quote?.[0];

    const price = parseNumber(meta?.regularMarketPrice);
    const prevClose = parseNumber(meta?.previousClose) ?? parseNumber(meta?.chartPreviousClose);
    if (price == null || prevClose == null) return null;

    const yahooQuote: TWSEQuote = {
      symbol,
      name: meta?.longName ?? meta?.shortName ?? symbol,
      price,
      prevClose,
      open: lastNumber(quote?.open),
      high: parseNumber(meta?.regularMarketDayHigh) ?? lastNumber(quote?.high),
      low: parseNumber(meta?.regularMarketDayLow) ?? lastNumber(quote?.low),
      volume: parseNumber(meta?.regularMarketVolume) ?? 0,
      updatedAt: (parseNumber(meta?.regularMarketTime) ?? Math.floor(Date.now() / 1000)) * 1000,
    };

    yahooFallbackCache.set(symbol, { quote: yahooQuote, fetchedAt: Date.now() });
    return yahooQuote;
  } catch {
    return null;
  }
}

async function applyYahooFallbacks(symbols: string[], quotes: TWSEQuote[]): Promise<TWSEQuote[]> {
  const bySymbol = new Map(quotes.map(q => [q.symbol, q] as const));
  const missingSymbols = symbols.filter(symbol => {
    const q = bySymbol.get(symbol);
    return !q || q.price === null;
  });

  for (const symbol of missingSymbols) {
    const yahooQuote = await fetchYahooQuote(symbol);
    if (!yahooQuote) continue;

    const existing = bySymbol.get(symbol);
    if (!existing) {
      bySymbol.set(symbol, yahooQuote);
      continue;
    }

    bySymbol.set(symbol, {
      ...existing,
      name: existing.name || yahooQuote.name,
      price: yahooQuote.price ?? existing.price,
      prevClose: yahooQuote.prevClose ?? existing.prevClose,
      open: yahooQuote.open ?? existing.open,
      high: yahooQuote.high ?? existing.high,
      low: yahooQuote.low ?? existing.low,
      volume: yahooQuote.volume || existing.volume,
      updatedAt: yahooQuote.updatedAt || existing.updatedAt,
    });
  }

  return symbols.map(symbol => bySymbol.get(symbol)).filter((quote): quote is TWSEQuote => Boolean(quote));
}

class RequestQueue {
  private running = false;
  private queue: Array<() => Promise<void>> = [];
  private lastRequestTime = 0;

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        const elapsed = Date.now() - this.lastRequestTime;
        const wait = Math.max(0, 2000 - elapsed);
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

async function withRetry<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    await new Promise(r => setTimeout(r, 5_000));
    try {
      return await fn();
    } catch {
      return null;
    }
  }
}

async function _fetchQuotes(symbols: string[]): Promise<TWSEQuote[]> {
  const exCh = symbols.map(s => `tse_${s}.tw`).join('|');
  const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${encodeURIComponent(exCh)}&json=1&delay=0`;
  const result = await withRetry(async () => {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'invest-app/1.0' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`TWSE HTTP ${res.status}`);
    const data = await res.json();
    return (data.msgArray ?? []).map((item: any): TWSEQuote => ({
      symbol: item.c,
      name: item.n,
      price: parseSentinel(item.z),
      prevClose: parseFloat(item.y),
      open: parseSentinel(item.o),
      high: parseSentinel(item.h),
      low: parseSentinel(item.l),
      volume: parseFloat(item.v) || 0,
      updatedAt: parseInt(item.tlong, 10),
    }));
  });
  return applyYahooFallbacks(symbols, result ?? []);
}

export async function getQuotes(symbols: string[]): Promise<TWSEQuote[]> {
  return _queue.enqueue(() => _fetchQuotes(symbols));
}

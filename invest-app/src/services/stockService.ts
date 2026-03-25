import { useSettingsStore } from '../features/settings/store/settingsStore';

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
  bid?: number | null;
  ask?: number | null;
  source?: 'twse_live' | 'twse_unpriced' | 'fugle_live' | 'yahoo_delayed' | 'alpha_vantage';
}

export interface QuoteFetchOptions {
  forceNetwork?: boolean;
  forceFugleLookup?: boolean;
  forceFugleNetwork?: boolean;
  forceAlphaVantageLookup?: boolean;
  forceAlphaVantageNetwork?: boolean;
}

interface FugleBookLevel {
  price?: number;
  size?: number;
}

interface FugleQuoteResponse {
  symbol?: string;
  name?: string;
  referencePrice?: number;
  previousClose?: number;
  openPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  closePrice?: number;
  lastPrice?: number;
  change?: number;
  changePercent?: number;
  bids?: FugleBookLevel[];
  asks?: FugleBookLevel[];
  total?: {
    tradeVolume?: number;
  };
  lastUpdated?: number;
  closeTime?: number;
  statusCode?: number;
  message?: string;
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

interface AlphaVantageGlobalQuoteResponse {
  'Global Quote'?: Record<string, string>;
  Information?: string;
  Note?: string;
  'Error Message'?: string;
}

interface AlphaVantageDailyResponse {
  'Time Series (Daily)'?: Record<string, Record<string, string>>;
  Information?: string;
  Note?: string;
  'Error Message'?: string;
}

interface AlphaVantageIntradayResponse {
  'Meta Data'?: Record<string, string>;
  [seriesKey: string]: unknown;
  Information?: string;
  Note?: string;
  'Error Message'?: string;
}

const YAHOO_CACHE_TTL_MS = 60_000;
const FUGLE_CACHE_TTL_MS = 15_000;
const ALPHA_VANTAGE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const ALPHA_VANTAGE_RATE_LIMIT_TTL_MS = 15 * 60 * 1000;
const ALPHA_VANTAGE_ERROR_TTL_MS = 15 * 60 * 1000;
const yahooFallbackCache = new Map<string, { quote: TWSEQuote; fetchedAt: number }>();
const fugleCache = new Map<
  string,
  {
    quote: TWSEQuote | null;
    fetchedAt: number;
    reason: 'success' | 'unauthorized' | 'error';
  }
>();
const alphaVantageCache = new Map<
  string,
  {
    quote: TWSEQuote | null;
    fetchedAt: number;
    reason: 'success' | 'unsupported' | 'rate_limit' | 'error';
  }
>();

function isAlphaVantageRateLimitMessage(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const normalized = value.toLowerCase();
  return normalized.includes('alpha vantage') && normalized.includes('limit');
}

function createTimeoutSignal(ms: number): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  };
}

export function parseSentinel(val: string): number | null {
  if (val === '-' || val === '') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function parseNumber(val: unknown): number | null {
  return typeof val === 'number' && Number.isFinite(val) ? val : null;
}

function normalizeFugleTimestamp(value: unknown): number | null {
  const timestamp = parseNumber(value);
  if (timestamp == null) return null;
  if (timestamp > 1_000_000_000_000_000) return Math.floor(timestamp / 1000);
  if (timestamp > 10_000_000_000_000) return Math.floor(timestamp / 1000);
  return timestamp;
}

function parseAlphaVantageNumber(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim();
  if (!text) return null;
  const parsed = parseFloat(text);
  return Number.isFinite(parsed) ? parsed : null;
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

function firstNumberFromBook(levels: string | undefined): number | null {
  if (!levels) return null;
  const [first] = levels.split('_');
  return parseSentinel(first ?? '');
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

function getCachedFugleQuote(symbol: string, now = Date.now()): TWSEQuote | null | undefined {
  const cached = fugleCache.get(symbol);
  if (!cached) return undefined;
  if (now - cached.fetchedAt > FUGLE_CACHE_TTL_MS) {
    fugleCache.delete(symbol);
    return undefined;
  }
  return cached.quote;
}

function getAlphaVantageCacheTtl(reason: 'success' | 'unsupported' | 'rate_limit' | 'error'): number {
  if (reason === 'rate_limit') return ALPHA_VANTAGE_RATE_LIMIT_TTL_MS;
  if (reason === 'error') return ALPHA_VANTAGE_ERROR_TTL_MS;
  return ALPHA_VANTAGE_CACHE_TTL_MS;
}

function getCachedAlphaVantageQuote(symbol: string, now = Date.now()): TWSEQuote | null | undefined {
  const cached = alphaVantageCache.get(symbol);
  if (!cached) return undefined;
  if (now - cached.fetchedAt > getAlphaVantageCacheTtl(cached.reason)) {
    alphaVantageCache.delete(symbol);
    return undefined;
  }
  return cached.quote;
}

function alphaVantageCandidates(symbol: string): string[] {
  return [`${symbol}.TW`, `${symbol}.TPE`];
}

function buildFugleQuoteFromResponse(symbol: string, data: FugleQuoteResponse): TWSEQuote | null {
  const price = parseNumber(data.lastPrice) ?? parseNumber(data.closePrice);
  const prevClose = parseNumber(data.previousClose) ?? parseNumber(data.referencePrice);
  if (price == null || prevClose == null) return null;

  return {
    symbol,
    name: data.name ?? symbol,
    price,
    prevClose,
    open: parseNumber(data.openPrice),
    high: parseNumber(data.highPrice),
    low: parseNumber(data.lowPrice),
    volume: parseNumber(data.total?.tradeVolume) ?? 0,
    updatedAt:
      normalizeFugleTimestamp(data.lastUpdated) ??
      normalizeFugleTimestamp(data.closeTime) ??
      Date.now(),
    bid: parseNumber(data.bids?.[0]?.price),
    ask: parseNumber(data.asks?.[0]?.price),
    source: 'fugle_live',
  };
}

async function fetchFugleJson<T>(url: string, apiKey: string): Promise<{ status: number; data: T | null }> {
  const { signal, cleanup } = createTimeoutSignal(10_000);
  try {
    const res = await fetch(url, {
      headers: {
        'X-API-KEY': apiKey,
        'User-Agent': 'invest-app/1.0',
      },
      signal,
    });

    if (res.status === 401) {
      return { status: 401, data: null };
    }

    if (!res.ok) {
      throw new Error(`Fugle HTTP ${res.status}`);
    }

    return {
      status: res.status,
      data: await res.json(),
    };
  } finally {
    cleanup();
  }
}

async function fetchFugleQuote(
  symbol: string,
  options: QuoteFetchOptions = {},
): Promise<TWSEQuote | null> {
  const { fugleApiKey, fugleEnabled } = useSettingsStore.getState();
  if (!fugleApiKey || !fugleEnabled) {
    return null;
  }

  const cached = options.forceFugleNetwork ? undefined : getCachedFugleQuote(symbol);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const { status, data } = await fugleQueue.enqueue(() =>
      fetchFugleJson<FugleQuoteResponse>(
        `https://api.fugle.tw/marketdata/v1.0/stock/intraday/quote/${encodeURIComponent(symbol)}`,
        fugleApiKey
      )
    );

    if (status === 401) {
      fugleCache.set(symbol, {
        quote: null,
        fetchedAt: Date.now(),
        reason: 'unauthorized',
      });
      return null;
    }

    const quote = data ? buildFugleQuoteFromResponse(symbol, data) : null;
    fugleCache.set(symbol, {
      quote,
      fetchedAt: Date.now(),
      reason: quote ? 'success' : 'error',
    });
    return quote;
  } catch {
    fugleCache.set(symbol, {
      quote: null,
      fetchedAt: Date.now(),
      reason: 'error',
    });
    return null;
  }
}

function buildAlphaVantageQuoteFromGlobalQuote(
  symbol: string,
  candidate: string,
  globalQuote: Record<string, string>,
): TWSEQuote | null {
  const price = parseAlphaVantageNumber(globalQuote['05. price']);
  const prevClose = parseAlphaVantageNumber(globalQuote['08. previous close']);
  if (price == null || prevClose == null) return null;

  return {
    symbol,
    name: candidate,
    price,
    prevClose,
    open: parseAlphaVantageNumber(globalQuote['02. open']),
    high: parseAlphaVantageNumber(globalQuote['03. high']),
    low: parseAlphaVantageNumber(globalQuote['04. low']),
    volume: parseAlphaVantageNumber(globalQuote['06. volume']) ?? 0,
    updatedAt: Date.now(),
    bid: null,
    ask: null,
    source: 'alpha_vantage',
  };
}

function buildAlphaVantageQuoteFromDailySeries(
  symbol: string,
  candidate: string,
  response: AlphaVantageDailyResponse,
): TWSEQuote | null {
  const series = response['Time Series (Daily)'];
  if (!series) return null;

  const dates = Object.keys(series).sort((a, b) => b.localeCompare(a));
  const latest = dates[0] ? series[dates[0]] : null;
  const previous = dates[1] ? series[dates[1]] : null;
  if (!latest) return null;

  const price = parseAlphaVantageNumber(latest['4. close']);
  const prevClose = parseAlphaVantageNumber(previous?.['4. close']) ?? price;
  if (price == null || prevClose == null) return null;

  return {
    symbol,
    name: candidate,
    price,
    prevClose,
    open: parseAlphaVantageNumber(latest['1. open']),
    high: parseAlphaVantageNumber(latest['2. high']),
    low: parseAlphaVantageNumber(latest['3. low']),
    volume: parseAlphaVantageNumber(latest['5. volume']) ?? 0,
    updatedAt: Date.parse(`${dates[0]}T00:00:00Z`) || Date.now(),
    bid: null,
    ask: null,
    source: 'alpha_vantage',
  };
}

function buildAlphaVantageQuoteFromIntradaySeries(
  symbol: string,
  candidate: string,
  response: AlphaVantageIntradayResponse,
): TWSEQuote | null {
  const seriesEntry = Object.entries(response).find(([key, value]) =>
    key.startsWith('Time Series') && value && typeof value === 'object'
  );
  const series = seriesEntry?.[1] as Record<string, Record<string, string>> | undefined;
  if (!series) return null;

  const timestamps = Object.keys(series).sort((a, b) => b.localeCompare(a));
  const latest = timestamps[0] ? series[timestamps[0]] : null;
  if (!latest) return null;

  const price = parseAlphaVantageNumber(latest['4. close']);
  const open = parseAlphaVantageNumber(latest['1. open']);
  const high = parseAlphaVantageNumber(latest['2. high']);
  const low = parseAlphaVantageNumber(latest['3. low']);
  const volume = parseAlphaVantageNumber(latest['5. volume']) ?? 0;

  if (price == null) return null;

  return {
    symbol,
    name: candidate,
    price,
    // Intraday payloads do not reliably include the prior close, so keep the
    // price usable and let daily fallback provide a better close when needed.
    prevClose: price,
    open,
    high,
    low,
    volume,
    updatedAt: Date.parse(timestamps[0].replace(' ', 'T')) || Date.now(),
    bid: null,
    ask: null,
    source: 'alpha_vantage',
  };
}

async function fetchAlphaVantageTimeSeriesQuote(
  symbol: string,
  candidate: string,
  apiKey: string,
): Promise<TWSEQuote | null> {
  const intradayUrl =
    `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${encodeURIComponent(candidate)}&interval=60min&outputsize=compact&apikey=${encodeURIComponent(apiKey)}`;
  const intradayResponse = await alphaVantageQueue.enqueue(() =>
    fetchAlphaVantageJson<AlphaVantageIntradayResponse>(intradayUrl)
  );

  if (intradayResponse.Information || intradayResponse.Note) {
    alphaVantageCache.set(symbol, {
      quote: null,
      fetchedAt: Date.now(),
      reason: 'rate_limit',
    });
    return null;
  }

  const intradayQuote = buildAlphaVantageQuoteFromIntradaySeries(symbol, candidate, intradayResponse);
  if (intradayQuote) {
    return intradayQuote;
  }

  const dailyUrl =
    `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(candidate)}&outputsize=compact&apikey=${encodeURIComponent(apiKey)}`;
  const dailyResponse = await alphaVantageQueue.enqueue(() =>
    fetchAlphaVantageJson<AlphaVantageDailyResponse>(dailyUrl)
  );

  if (dailyResponse.Information || dailyResponse.Note) {
    alphaVantageCache.set(symbol, {
      quote: null,
      fetchedAt: Date.now(),
      reason: 'rate_limit',
    });
    return null;
  }

  return buildAlphaVantageQuoteFromDailySeries(symbol, candidate, dailyResponse);
}

async function fetchAlphaVantageJson<T>(url: string): Promise<T> {
  const { signal, cleanup } = createTimeoutSignal(10_000);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'invest-app/1.0' },
      signal,
    });
    if (!res.ok) {
      throw new Error(`Alpha Vantage HTTP ${res.status}`);
    }
    const data = await res.json();
    await useSettingsStore.getState().recordAlphaVantageRequest();
    if (
      isAlphaVantageRateLimitMessage((data as AlphaVantageGlobalQuoteResponse | undefined)?.Information) ||
      isAlphaVantageRateLimitMessage((data as AlphaVantageGlobalQuoteResponse | undefined)?.Note)
    ) {
      await useSettingsStore.getState().markAlphaVantageLimitReached();
    }
    return data;
  } finally {
    cleanup();
  }
}

async function fetchAlphaVantageQuote(
  symbol: string,
  options: QuoteFetchOptions = {},
): Promise<TWSEQuote | null> {
  await useSettingsStore.getState().ensureAlphaVantageQuotaCurrent();
  const {
    alphaVantageApiKey,
    alphaVantageEnabled,
    alphaVantageDailyRemaining,
  } = useSettingsStore.getState();
  if (
    !alphaVantageApiKey ||
    !alphaVantageEnabled ||
    alphaVantageDailyRemaining <= 0
  ) {
    return null;
  }

  const cached = options.forceAlphaVantageNetwork ? undefined : getCachedAlphaVantageQuote(symbol);
  if (cached !== undefined) {
    return cached;
  }

  for (const candidate of alphaVantageCandidates(symbol)) {
    try {
      const globalUrl =
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(candidate)}&apikey=${encodeURIComponent(alphaVantageApiKey)}`;
      const globalResponse = await alphaVantageQueue.enqueue(() =>
        fetchAlphaVantageJson<AlphaVantageGlobalQuoteResponse>(globalUrl)
      );

      if (globalResponse.Information || globalResponse.Note) {
        alphaVantageCache.set(symbol, {
          quote: null,
          fetchedAt: Date.now(),
          reason: 'rate_limit',
        });
        return null;
      }

      const globalQuote = globalResponse['Global Quote'];
      let quote =
        globalQuote && Object.keys(globalQuote).length > 0
          ? buildAlphaVantageQuoteFromGlobalQuote(symbol, candidate, globalQuote)
          : null;
      if (!quote) {
        quote = await fetchAlphaVantageTimeSeriesQuote(symbol, candidate, alphaVantageApiKey);
      }

      if (quote) {
        alphaVantageCache.set(symbol, {
          quote,
          fetchedAt: Date.now(),
          reason: 'success',
        });
        return quote;
      }
    } catch {
      alphaVantageCache.set(symbol, {
        quote: null,
        fetchedAt: Date.now(),
        reason: 'error',
      });
      return null;
    }
  }

  alphaVantageCache.set(symbol, {
    quote: null,
    fetchedAt: Date.now(),
    reason: 'unsupported',
  });
  return null;
}

async function fetchYahooQuote(symbol: string, options: QuoteFetchOptions = {}): Promise<TWSEQuote | null> {
  const cached = options.forceNetwork ? null : getCachedYahooQuote(symbol);
  if (cached) return cached;

  const yahooSymbol = `${symbol}.TW`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1m&range=1d&includePrePost=false`;

  try {
    const { signal, cleanup } = createTimeoutSignal(10_000);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal,
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
        bid: null,
        ask: null,
        source: 'yahoo_delayed',
      };

      yahooFallbackCache.set(symbol, { quote: yahooQuote, fetchedAt: Date.now() });
      return yahooQuote;
    } finally {
      cleanup();
    }
  } catch {
    return null;
  }
}

async function applyFugleFallbacks(
  symbols: string[],
  quotes: TWSEQuote[],
  options: QuoteFetchOptions = {}
): Promise<TWSEQuote[]> {
  const { fugleApiKey, fugleEnabled } = useSettingsStore.getState();
  if (!fugleApiKey || !fugleEnabled || options.forceAlphaVantageLookup) {
    return quotes;
  }

  const bySymbol = new Map(quotes.map(q => [q.symbol, q] as const));
  const candidateSymbols = options.forceFugleLookup
    ? symbols
    : symbols.filter(symbol => {
        const q = bySymbol.get(symbol);
        return !q || q.price === null;
      });

  for (const symbol of candidateSymbols) {
    const fugleQuote = await fetchFugleQuote(symbol, options);
    if (!fugleQuote) continue;

    const existing = bySymbol.get(symbol);
    if (!existing) {
      bySymbol.set(symbol, fugleQuote);
      continue;
    }

    if (existing.price != null && !options.forceFugleLookup) {
      continue;
    }

    bySymbol.set(symbol, {
      ...existing,
      name: fugleQuote.name || existing.name,
      price: fugleQuote.price ?? existing.price,
      prevClose: fugleQuote.prevClose ?? existing.prevClose,
      open: fugleQuote.open ?? existing.open,
      high: fugleQuote.high ?? existing.high,
      low: fugleQuote.low ?? existing.low,
      volume: fugleQuote.volume || existing.volume,
      updatedAt: fugleQuote.updatedAt || existing.updatedAt,
      bid: fugleQuote.bid ?? existing.bid ?? null,
      ask: fugleQuote.ask ?? existing.ask ?? null,
      source: fugleQuote.source ?? existing.source,
    });
  }

  return symbols.map(symbol => bySymbol.get(symbol)).filter((quote): quote is TWSEQuote => Boolean(quote));
}

async function applyYahooFallbacks(
  symbols: string[],
  quotes: TWSEQuote[],
  options: QuoteFetchOptions = {}
): Promise<TWSEQuote[]> {
  const bySymbol = new Map(quotes.map(q => [q.symbol, q] as const));
  const missingSymbols = symbols.filter(symbol => {
    const q = bySymbol.get(symbol);
    return !q || q.price === null;
  });

  for (const symbol of missingSymbols) {
    const yahooQuote = await fetchYahooQuote(symbol, options);
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
      bid: existing.bid ?? yahooQuote.bid ?? null,
      ask: existing.ask ?? yahooQuote.ask ?? null,
      source: 'yahoo_delayed',
    });
  }

  return symbols.map(symbol => bySymbol.get(symbol)).filter((quote): quote is TWSEQuote => Boolean(quote));
}

class RequestQueue {
  private running = false;
  private queue: Array<() => Promise<void>> = [];
  private lastRequestTime = 0;

  constructor(private readonly minIntervalMs = 2000) {}

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        const elapsed = Date.now() - this.lastRequestTime;
        const wait = Math.max(0, this.minIntervalMs - elapsed);
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

const _queue = new RequestQueue(2000);
const fugleQueue = new RequestQueue(1100);
const alphaVantageQueue = new RequestQueue(1200);

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

async function _fetchQuotes(symbols: string[], options: QuoteFetchOptions = {}): Promise<TWSEQuote[]> {
  const exCh = symbols.map(s => `tse_${s}.tw`).join('|');
  const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${encodeURIComponent(exCh)}&json=1&delay=0`;
  const result = await withRetry(async () => {
    const { signal, cleanup } = createTimeoutSignal(10_000);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'invest-app/1.0' },
        signal,
      });
      if (!res.ok) throw new Error(`TWSE HTTP ${res.status}`);
      const data = await res.json();
      return (data.msgArray ?? []).map((item: any): TWSEQuote => {
        const price = parseSentinel(item.z);
        return {
          symbol: item.c,
          name: item.n,
          price,
          prevClose: parseFloat(item.y),
          open: parseSentinel(item.o),
          high: parseSentinel(item.h),
          low: parseSentinel(item.l),
          volume: parseFloat(item.v) || 0,
          updatedAt: parseInt(item.tlong, 10),
          bid: firstNumberFromBook(item.b),
          ask: firstNumberFromBook(item.a),
          source: price != null ? 'twse_live' : 'twse_unpriced',
        };
      });
    } finally {
      cleanup();
    }
  });
  const fugleAugmented = await applyFugleFallbacks(symbols, result ?? [], options);
  const alphaAugmented = await applyAlphaVantageFallbacks(symbols, fugleAugmented, options);
  return applyYahooFallbacks(symbols, alphaAugmented, options);
}

export async function getQuotes(symbols: string[], options: QuoteFetchOptions = {}): Promise<TWSEQuote[]> {
  return _queue.enqueue(() => _fetchQuotes(symbols, options));
}

async function applyAlphaVantageFallbacks(
  symbols: string[],
  quotes: TWSEQuote[],
  options: QuoteFetchOptions = {},
): Promise<TWSEQuote[]> {
  await useSettingsStore.getState().ensureAlphaVantageQuotaCurrent();
  const {
    alphaVantageApiKey,
    alphaVantageEnabled,
    alphaVantageDailyRemaining,
  } = useSettingsStore.getState();
  if (
    options.forceFugleLookup ||
    !alphaVantageApiKey ||
    !alphaVantageEnabled ||
    alphaVantageDailyRemaining <= 0
  ) {
    return quotes;
  }

  const bySymbol = new Map(quotes.map(q => [q.symbol, q] as const));
  const candidateSymbols = options.forceAlphaVantageLookup
    ? symbols
    : symbols.filter(symbol => {
        const q = bySymbol.get(symbol);
        return !q || q.price === null;
      });

  for (const symbol of candidateSymbols) {
    const alphaQuote = await fetchAlphaVantageQuote(symbol, options);
    if (!alphaQuote) continue;

    const existing = bySymbol.get(symbol);
    if (!existing) {
      bySymbol.set(symbol, alphaQuote);
      continue;
    }

    if (existing.price != null) {
      continue;
    }

    bySymbol.set(symbol, {
      ...existing,
      name: existing.name || alphaQuote.name,
      price: alphaQuote.price ?? existing.price,
      prevClose: alphaQuote.prevClose ?? existing.prevClose,
      open: alphaQuote.open ?? existing.open,
      high: alphaQuote.high ?? existing.high,
      low: alphaQuote.low ?? existing.low,
      volume: alphaQuote.volume || existing.volume,
      updatedAt: alphaQuote.updatedAt || existing.updatedAt,
      source: 'alpha_vantage',
    });
  }

  return symbols.map(symbol => bySymbol.get(symbol)).filter((quote): quote is TWSEQuote => Boolean(quote));
}

export function resetAlphaVantageCache() {
  alphaVantageCache.clear();
}

export function resetFugleCache() {
  fugleCache.clear();
}

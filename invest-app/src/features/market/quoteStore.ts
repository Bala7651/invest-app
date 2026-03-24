import { create } from 'zustand';
import { checkAlerts } from '../alerts/services/alertMonitor';
import { getQuotes, QuoteFetchOptions } from '../../services/stockService';
import { isMarketOpen } from './marketHours';
import { fetchLatestQuoteForSummary, SummaryQuoteData } from '../summary/services/summaryService';
import { useSettingsStore } from '../settings/store/settingsStore';
import { QuoteSource } from './quotePresentation';

export interface Quote {
  symbol: string;
  name: string;
  price: number | null;
  prevClose: number;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number;
  change: number;
  changePct: number;
  fetchedAt: number;
  bid: number | null;
  ask: number | null;
  source: QuoteSource;
}

interface QuoteState {
  quotes: Record<string, Quote>;
  tickHistory: Record<string, number[]>;
  polling: boolean;
  lastError: string | null;
  _intervalId: ReturnType<typeof setInterval> | null;
  startPolling: (symbols: string[]) => void;
  stopPolling: () => void;
  forceRefresh: (symbols: string[], options?: QuoteFetchOptions) => Promise<void>;
}

function buildResolvedQuote(q: {
  symbol: string;
  name: string;
  price: number;
  prevClose: number;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number;
  bid?: number | null;
  ask?: number | null;
  source?: 'twse_live' | 'alpha_vantage' | 'yahoo_delayed' | 'twse_unpriced';
}, fetchedAt: number): Quote {
  const change = q.price - q.prevClose;
  const changePct = (change / q.prevClose) * 100;
  return {
    symbol: q.symbol,
    name: q.name,
    price: q.price,
    prevClose: q.prevClose,
    open: q.open,
    high: q.high,
    low: q.low,
    volume: q.volume,
    change,
    changePct,
    fetchedAt,
    bid: q.bid ?? null,
    ask: q.ask ?? null,
    source:
      q.source === 'alpha_vantage'
        ? 'alpha_vantage'
        : q.source === 'yahoo_delayed'
          ? 'yahoo_delayed'
          : 'twse_live',
  };
}

function buildQuoteFromDaily(
  symbol: string,
  name: string,
  summary: SummaryQuoteData,
  fetchedAt: number,
  bid: number | null = null,
  ask: number | null = null
): Quote {
  return {
    symbol,
    name,
    price: summary.price,
    prevClose: summary.prevClose,
    open: summary.open,
    high: summary.high,
    low: summary.low,
    volume: summary.volume ?? 0,
    change: summary.change,
    changePct: summary.changePct,
    fetchedAt,
    bid,
    ask,
    source: 'twse_close',
  };
}

function buildPrevCloseFallback(q: {
  symbol: string;
  name: string;
  prevClose: number;
  volume: number;
  bid?: number | null;
  ask?: number | null;
}, fetchedAt: number): Quote {
  return {
    symbol: q.symbol,
    name: q.name,
    price: q.prevClose,
    prevClose: q.prevClose,
    open: null,
    high: null,
    low: null,
    volume: q.volume,
    change: 0,
    changePct: 0,
    fetchedAt,
    bid: q.bid ?? null,
    ask: q.ask ?? null,
    source: 'prev_close',
  };
}

async function loadDailyFallbacks(
  raw: Array<{ symbol: string; price: number | null }>
): Promise<Record<string, SummaryQuoteData | null>> {
  const missing = raw.filter(q => q.price === null);
  if (missing.length === 0) return {};

  const results = await Promise.all(
    missing.map(async q => [q.symbol, await fetchLatestQuoteForSummary(q.symbol).catch(() => null)] as const)
  );

  return Object.fromEntries(results);
}

export const useQuoteStore = create<QuoteState>((set, get) => ({
  quotes: {},
  tickHistory: {},
  polling: false,
  lastError: null,
  _intervalId: null,

  startPolling(symbols: string[]) {
    if (get().polling) return;
    if (!isMarketOpen()) {
      set({ polling: false });
      return;
    }

    const tick = async () => {
      if (!isMarketOpen()) {
        // Final fetch before stopping
        try {
          const raw = await getQuotes(symbols);
          const fetchedAt = Date.now();
          const dailyFallbacks = await loadDailyFallbacks(raw);
          const quotes: Record<string, Quote> = {};
          for (const q of raw) {
            const previous = get().quotes[q.symbol];
            if (q.price !== null) {
              quotes[q.symbol] = buildResolvedQuote(q as typeof q & { price: number }, fetchedAt);
              continue;
            }

            const daily = dailyFallbacks[q.symbol];
            if (daily?.price != null) {
              quotes[q.symbol] = buildQuoteFromDaily(q.symbol, q.name, daily, fetchedAt, q.bid ?? null, q.ask ?? null);
            } else if (previous?.price != null) {
              quotes[q.symbol] = {
                ...previous,
                symbol: q.symbol,
                name: q.name,
                prevClose: q.prevClose,
                bid: q.bid ?? previous.bid,
                ask: q.ask ?? previous.ask,
                fetchedAt,
              };
            } else {
              quotes[q.symbol] = buildPrevCloseFallback(q, fetchedAt);
            }
          }
          const tickHistory = { ...get().tickHistory };
          for (const q of raw) {
            if (q.price !== null) {
              const prev = tickHistory[q.symbol] ?? [];
              tickHistory[q.symbol] = [...prev, q.price];
            }
          }
          set({ quotes: { ...get().quotes, ...quotes }, tickHistory, lastError: null });
        } catch (e) {
          set({ lastError: String(e) });
        }
        get().stopPolling();
        return;
      }

      try {
        const raw = await getQuotes(symbols);
        const fetchedAt = Date.now();
        const dailyFallbacks = await loadDailyFallbacks(raw);
        const quotes: Record<string, Quote> = {};
        const alertQuotes: Record<string, Quote> = {};
        for (const q of raw) {
          const previous = get().quotes[q.symbol];
          if (q.price !== null) {
            const liveQuote = buildResolvedQuote(q as typeof q & { price: number }, fetchedAt);
            quotes[q.symbol] = liveQuote;
            alertQuotes[q.symbol] = liveQuote;
            continue;
          }

          if (previous?.price != null) {
            quotes[q.symbol] = {
              ...previous,
              symbol: q.symbol,
              name: q.name,
              prevClose: q.prevClose,
              bid: q.bid ?? previous.bid,
              ask: q.ask ?? previous.ask,
              fetchedAt,
            };
            continue;
          }

          const daily = dailyFallbacks[q.symbol];
          if (daily?.price != null) {
            quotes[q.symbol] = buildQuoteFromDaily(q.symbol, q.name, daily, fetchedAt, q.bid ?? null, q.ask ?? null);
          } else {
            quotes[q.symbol] = buildPrevCloseFallback(q, fetchedAt);
          }
        }
        const tickHistory = { ...get().tickHistory };
        for (const q of raw) {
          if (q.price !== null) {
            const prev = tickHistory[q.symbol] ?? [];
            tickHistory[q.symbol] = [...prev, q.price];
          }
        }
        set({ quotes: { ...get().quotes, ...quotes }, tickHistory, lastError: null });
        checkAlerts(alertQuotes).catch(() => {});
      } catch (e) {
        set({ lastError: String(e) });
      }
    };

    tick();

    const id = setInterval(tick, 30_000);
    set({ polling: true, _intervalId: id });
  },

  stopPolling() {
    const { _intervalId } = get();
    if (_intervalId !== null) {
      clearInterval(_intervalId);
    }
    set({ polling: false, _intervalId: null, tickHistory: {} });
  },

  async forceRefresh(symbols: string[], options: QuoteFetchOptions = {}) {
    try {
      const raw = await getQuotes(symbols, options);
      if (symbols.length > 0 && raw.length === 0) {
        const { marketDataProvider, alphaVantageApiKey, alphaVantageEnabled } = useSettingsStore.getState();
        if (marketDataProvider === 'alpha_vantage' && alphaVantageApiKey && alphaVantageEnabled) {
          throw new Error('Alpha Vantage、TWSE 與 Yahoo 都沒有返回任何報價資料');
        }
        throw new Error('TWSE 與 Yahoo 都沒有返回任何報價資料');
      }
      const fetchedAt = Date.now();
      const marketOpen = isMarketOpen();
      const dailyFallbacks = await loadDailyFallbacks(raw);
      const quotesUpdate: Record<string, Quote> = {};
      const tickHistory = { ...get().tickHistory };
      for (const q of raw) {
        const previous = get().quotes[q.symbol];
        if (q.price !== null) {
          quotesUpdate[q.symbol] = buildResolvedQuote(q as typeof q & { price: number }, fetchedAt);
          tickHistory[q.symbol] = [...(tickHistory[q.symbol] ?? []), q.price];
          continue;
        }

        if (marketOpen && previous?.price != null) {
          quotesUpdate[q.symbol] = {
            ...previous,
            symbol: q.symbol,
            name: q.name,
            prevClose: q.prevClose,
            bid: q.bid ?? previous.bid,
            ask: q.ask ?? previous.ask,
            fetchedAt,
          };
          continue;
        }

        const daily = dailyFallbacks[q.symbol];
        if (daily?.price != null) {
          quotesUpdate[q.symbol] = buildQuoteFromDaily(q.symbol, q.name, daily, fetchedAt, q.bid ?? null, q.ask ?? null);
        } else if (previous?.price != null) {
          quotesUpdate[q.symbol] = {
            ...previous,
            symbol: q.symbol,
            name: q.name,
            prevClose: q.prevClose,
            bid: q.bid ?? previous.bid,
            ask: q.ask ?? previous.ask,
            fetchedAt,
          };
        } else {
          quotesUpdate[q.symbol] = buildPrevCloseFallback(q, fetchedAt);
        }
      }
      set({ quotes: { ...get().quotes, ...quotesUpdate }, tickHistory, lastError: null });
    } catch (e) {
      set({ lastError: String(e) });
    }
  },
}));

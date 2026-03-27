import { create } from 'zustand';
import { checkAlerts } from '../alerts/services/alertMonitor';
import { getQuotes, QuoteFetchOptions } from '../../services/stockService';
import { isMarketOpen } from './marketHours';
import { fetchLatestQuoteForSummary, SummaryQuoteData } from '../summary/services/summaryService';
import { useSettingsStore } from '../settings/store/settingsStore';
import { QuoteFreshnessState, QuoteSource } from './quotePresentation';
import {
  loadPersistedQuotes as loadPersistedQuotesFromDb,
  upsertPersistedQuotes,
  PersistedQuoteEntry,
} from './services/quoteCacheService';
import {
  connectFugleWatchlistStream,
  disconnectFugleWatchlistStream,
  FugleTradeUpdate,
} from './services/fugleStreamService';
import { tFromStore } from '../i18n/useI18n';

const REST_POLL_INTERVAL_MS = 30_000;
const POLL_LOOP_INTERVAL_MS = 10_000;
const FUGLE_STALE_AFTER_MS = 25_000;
const FUGLE_STALE_REFRESH_INTERVAL_MS = 20_000;

const SOURCE_PRIORITY: Record<QuoteSource, number> = {
  fugle_live: 0,
  twse_live: 1,
  alpha_vantage: 2,
  yahoo_delayed: 3,
  twse_close: 4,
  prev_close: 5,
};

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
  sourceUpdatedAt: number | null;
  freshnessState: QuoteFreshnessState;
}

interface QuoteState {
  quotes: Record<string, Quote>;
  tickHistory: Record<string, number[]>;
  polling: boolean;
  lastError: string | null;
  _pollTimeoutId: ReturnType<typeof setTimeout> | null;
  _pollGeneration: number;
  _pollInFlight: boolean;
  _pollSymbols: string[];
  _lastRestRefreshAt: number;
  _lastFugleBootstrapAt: number;
  _lastFugleStaleRefreshAt: number;
  _lastFugleTradeAtBySymbol: Record<string, number>;
  _fugleConnected: boolean;
  loadPersistedQuotes: (symbols: string[]) => Promise<void>;
  persistQuotes: (symbols?: string[]) => Promise<void>;
  startPolling: (symbols: string[]) => void;
  stopPolling: () => void;
  forceRefresh: (symbols: string[], options?: QuoteFetchOptions) => Promise<void>;
}

function getSourceTimestamp(quote: Pick<Quote, 'sourceUpdatedAt' | 'fetchedAt'>): number {
  return quote.sourceUpdatedAt ?? quote.fetchedAt;
}

function isIncomingPreferred(existing: Quote, incoming: Quote): boolean {
  const existingTs = getSourceTimestamp(existing);
  const incomingTs = getSourceTimestamp(incoming);
  if (incomingTs !== existingTs) {
    return incomingTs > existingTs;
  }
  if (incoming.fetchedAt !== existing.fetchedAt) {
    if (SOURCE_PRIORITY[incoming.source] !== SOURCE_PRIORITY[existing.source]) {
      return SOURCE_PRIORITY[incoming.source] < SOURCE_PRIORITY[existing.source];
    }
    return incoming.fetchedAt > existing.fetchedAt;
  }
  if (incoming.source === existing.source) {
    return true;
  }
  return SOURCE_PRIORITY[incoming.source] < SOURCE_PRIORITY[existing.source];
}

function mergeQuotes(existing: Quote | undefined, incoming: Quote): Quote {
  if (!existing) return incoming;

  if (isIncomingPreferred(existing, incoming)) {
    return {
      ...existing,
      ...incoming,
      open: incoming.open ?? existing.open,
      high: incoming.high ?? existing.high,
      low: incoming.low ?? existing.low,
      bid: incoming.bid ?? existing.bid ?? null,
      ask: incoming.ask ?? existing.ask ?? null,
      volume: incoming.volume || existing.volume,
      sourceUpdatedAt: incoming.sourceUpdatedAt ?? existing.sourceUpdatedAt,
      freshnessState: incoming.freshnessState ?? existing.freshnessState,
    };
  }

  return {
    ...existing,
    name: incoming.name || existing.name,
    prevClose: incoming.prevClose || existing.prevClose,
    open: existing.open ?? incoming.open,
    high: existing.high ?? incoming.high,
    low: existing.low ?? incoming.low,
    bid: existing.bid ?? incoming.bid ?? null,
    ask: existing.ask ?? incoming.ask ?? null,
    volume: Math.max(existing.volume, incoming.volume),
    fetchedAt: Math.max(existing.fetchedAt, incoming.fetchedAt),
  };
}

function withFreshness(quote: Quote, freshnessState: QuoteFreshnessState): Quote {
  return { ...quote, freshnessState };
}

function isLiveSource(source: QuoteSource): boolean {
  return source === 'fugle_live' || source === 'twse_live';
}

function appendTickHistory(
  tickHistory: Record<string, number[]>,
  symbol: string,
  price: number,
): Record<string, number[]> {
  return {
    ...tickHistory,
    [symbol]: [...(tickHistory[symbol] ?? []), price].slice(-120),
  };
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
  updatedAt?: number;
  source?: 'twse_live' | 'fugle_live' | 'alpha_vantage' | 'yahoo_delayed' | 'twse_unpriced';
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
      q.source === 'fugle_live'
        ? 'fugle_live'
        : q.source === 'alpha_vantage'
        ? 'alpha_vantage'
        : q.source === 'yahoo_delayed'
        ? 'yahoo_delayed'
        : 'twse_live',
    sourceUpdatedAt: q.updatedAt ?? fetchedAt,
    freshnessState: 'fresh',
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
    sourceUpdatedAt: fetchedAt,
    freshnessState: 'fresh',
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
    sourceUpdatedAt: fetchedAt,
    freshnessState: 'fresh',
  };
}

function buildCarryForwardQuote(
  previous: Quote,
  q: {
    symbol: string;
    name: string;
    prevClose: number;
    bid?: number | null;
    ask?: number | null;
  },
  fetchedAt: number,
): Quote {
  return {
    ...previous,
    symbol: q.symbol,
    name: q.name,
    prevClose: q.prevClose,
    bid: q.bid ?? previous.bid,
    ask: q.ask ?? previous.ask,
    fetchedAt,
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

function buildNoQuotesError(): Error {
  const {
    marketDataProvider,
    alphaVantageApiKey,
    alphaVantageEnabled,
    fugleApiKey,
    fugleEnabled,
  } = useSettingsStore.getState();
  if (marketDataProvider === 'fugle' && fugleApiKey && fugleEnabled) {
    return new Error(tFromStore('market.error.noQuotes.fugle'));
  }
  if (marketDataProvider === 'alpha_vantage' && alphaVantageApiKey && alphaVantageEnabled) {
    return new Error(tFromStore('market.error.noQuotes.alpha'));
  }
  return new Error(tFromStore('market.error.noQuotes.twseYahoo'));
}

export const useQuoteStore = create<QuoteState>((set, get) => {
  let activePollRun: Promise<void> | null = null;

  const clearPollTimer = () => {
    const timeoutId = get()._pollTimeoutId;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    set({ _pollTimeoutId: null });
  };

  const waitForPollIdle = async () => {
    while (get()._pollInFlight) {
      const inFlightRun = activePollRun;
      if (inFlightRun) {
        await inFlightRun.catch(() => {});
      } else {
        await new Promise(resolve => setTimeout(resolve, 25));
      }
    }
  };

  const persistQuotesNow = async (symbols: string[]) => {
    if (symbols.length === 0) return;

    const uniqueSymbols = Array.from(new Set(symbols));
    const entries: PersistedQuoteEntry[] = uniqueSymbols
      .map((symbol) => get().quotes[symbol])
      .filter((quote): quote is Quote => Boolean(quote))
      .map((quote) => ({
        symbol: quote.symbol,
        name: quote.name,
        price: quote.price,
        prevClose: quote.prevClose,
        open: quote.open,
        high: quote.high,
        low: quote.low,
        volume: quote.volume,
        change: quote.change,
        changePct: quote.changePct,
        fetchedAt: quote.fetchedAt,
        bid: quote.bid,
        ask: quote.ask,
        source: quote.source,
        sourceUpdatedAt: quote.sourceUpdatedAt,
        freshnessState: quote.freshnessState,
      }));

    if (entries.length === 0) return;
    await upsertPersistedQuotes(entries);
  };

  const markSymbolsStale = (symbols: string[], fetchedAt = Date.now()) => {
    if (symbols.length === 0) return;
    const nextQuotes = { ...get().quotes };
    let changed = false;
    for (const symbol of symbols) {
      const existing = nextQuotes[symbol];
      if (!existing || existing.source !== 'fugle_live' || existing.freshnessState === 'stale') {
        continue;
      }
      nextQuotes[symbol] = withFreshness(
        {
          ...existing,
          fetchedAt,
        },
        'stale',
      );
      changed = true;
    }
    if (changed) {
      set({ quotes: nextQuotes });
    }
  };

  const applyRawQuotes = async (
    symbols: string[],
    raw: Array<{
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
      source?: 'twse_live' | 'fugle_live' | 'alpha_vantage' | 'yahoo_delayed' | 'twse_unpriced';
    }>,
    fetchedAt: number,
    options: {
      preserveMarketOpenCarryForward: boolean;
      fugleRefreshSymbols?: string[];
      updateRestTimestamp?: boolean;
      updateFugleBootstrapAt?: boolean;
      updateFugleStaleRefreshAt?: boolean;
    },
  ) => {
    const marketOpen = isMarketOpen();
    const dailyFallbacks = await loadDailyFallbacks(raw);
    const nextQuotes = { ...get().quotes };
    let tickHistory = { ...get().tickHistory };
    const alertQuotes: Record<string, Quote> = {};
    const fugleRefreshed = new Set<string>();

    for (const q of raw) {
      const previous = nextQuotes[q.symbol];
      let nextQuote: Quote;

      if (q.price !== null) {
        nextQuote = buildResolvedQuote(q as typeof q & { price: number }, fetchedAt);
      } else if (options.preserveMarketOpenCarryForward && marketOpen && previous?.price != null) {
        nextQuote = buildCarryForwardQuote(previous, q, fetchedAt);
      } else {
        const daily = dailyFallbacks[q.symbol];
        if (daily?.price != null) {
          nextQuote = buildQuoteFromDaily(q.symbol, q.name, daily, fetchedAt, q.bid ?? null, q.ask ?? null);
        } else if (previous?.price != null) {
          nextQuote = buildCarryForwardQuote(previous, q, fetchedAt);
        } else {
          nextQuote = buildPrevCloseFallback(q, fetchedAt);
        }
      }

      const merged = mergeQuotes(previous, nextQuote);
      nextQuotes[q.symbol] = merged;
      if (
        merged.price != null &&
        (q.price !== null || nextQuote.source === 'fugle_live' || nextQuote.source === 'twse_live')
      ) {
        tickHistory = appendTickHistory(tickHistory, q.symbol, merged.price);
      }
      if (nextQuote.price != null) {
        alertQuotes[q.symbol] = merged;
      }
      if (nextQuote.source === 'fugle_live') {
        fugleRefreshed.add(q.symbol);
      }
    }

    if (options.fugleRefreshSymbols?.length) {
      for (const symbol of options.fugleRefreshSymbols) {
        if (fugleRefreshed.has(symbol)) continue;
        const existing = nextQuotes[symbol];
        if (existing?.source === 'fugle_live') {
          nextQuotes[symbol] = withFreshness(
            {
              ...existing,
              fetchedAt,
            },
            'stale',
          );
        }
      }
    }

    set((state) => ({
      quotes: nextQuotes,
      tickHistory,
      lastError: null,
      _lastRestRefreshAt: options.updateRestTimestamp ? fetchedAt : state._lastRestRefreshAt,
      _lastFugleBootstrapAt: options.updateFugleBootstrapAt ? fetchedAt : state._lastFugleBootstrapAt,
      _lastFugleStaleRefreshAt: options.updateFugleStaleRefreshAt ? fetchedAt : state._lastFugleStaleRefreshAt,
    }));

    if (Object.keys(alertQuotes).length > 0) {
      checkAlerts(alertQuotes).catch(() => {});
    }

    void persistQuotesNow(symbols);
  };

  const refreshQuotes = async (
    symbols: string[],
    options: QuoteFetchOptions = {},
    meta: {
      preserveMarketOpenCarryForward?: boolean;
      updateRestTimestamp?: boolean;
      updateFugleBootstrapAt?: boolean;
      updateFugleStaleRefreshAt?: boolean;
      treatEmptyAsError?: boolean;
      fugleRefreshSymbols?: string[];
    } = {},
  ) => {
    const raw = await getQuotes(symbols, options);
    if (symbols.length > 0 && raw.length === 0 && meta.treatEmptyAsError) {
      throw buildNoQuotesError();
    }
    const fetchedAt = Date.now();
    await applyRawQuotes(symbols, raw, fetchedAt, {
      preserveMarketOpenCarryForward: meta.preserveMarketOpenCarryForward ?? true,
      fugleRefreshSymbols: meta.fugleRefreshSymbols,
      updateRestTimestamp: meta.updateRestTimestamp ?? false,
      updateFugleBootstrapAt: meta.updateFugleBootstrapAt ?? false,
      updateFugleStaleRefreshAt: meta.updateFugleStaleRefreshAt ?? false,
    });
    return fetchedAt;
  };

  const connectFugleIfNeeded = (symbols: string[]) => {
    const {
      fugleApiKey,
      fugleEnabled,
    } = useSettingsStore.getState();

    if (!fugleApiKey || !fugleEnabled || symbols.length === 0) {
      disconnectFugleWatchlistStream();
      set({ _fugleConnected: false });
      return;
    }

    connectFugleWatchlistStream(fugleApiKey, symbols, {
      onTrade: (update: FugleTradeUpdate) => {
        const previous = get().quotes[update.symbol];
        const prevClose = previous?.prevClose ?? update.price;
        const incoming: Quote = {
          symbol: update.symbol,
          name: previous?.name ?? update.symbol,
          price: update.price,
          prevClose,
          open: previous?.open ?? null,
          high: previous ? Math.max(previous.high ?? update.price, update.price) : update.price,
          low: previous ? Math.min(previous.low ?? update.price, update.price) : update.price,
          volume: update.volume || previous?.volume || 0,
          change: update.price - prevClose,
          changePct: prevClose === 0 ? 0 : ((update.price - prevClose) / prevClose) * 100,
          fetchedAt: update.updatedAt,
          bid: update.bid ?? previous?.bid ?? null,
          ask: update.ask ?? previous?.ask ?? null,
          source: 'fugle_live',
          sourceUpdatedAt: update.updatedAt,
          freshnessState: 'fresh',
        };

        const merged = mergeQuotes(previous, incoming);
        set((state) => ({
          quotes: {
            ...state.quotes,
            [update.symbol]: merged,
          },
          tickHistory: appendTickHistory(state.tickHistory, update.symbol, update.price),
          lastError: null,
          _lastFugleTradeAtBySymbol: {
            ...state._lastFugleTradeAtBySymbol,
            [update.symbol]: update.updatedAt,
          },
          _fugleConnected: true,
        }));
        checkAlerts({ [update.symbol]: merged }).catch(() => {});
      },
      onAuthenticated: () => {
        set({ _fugleConnected: true, lastError: null });
      },
      onDisconnected: () => {
        set({ _fugleConnected: false });
      },
      onUnauthorized: () => {
        set({ _fugleConnected: false, lastError: tFromStore('market.error.fugleAuth') });
      },
      onStatus: (message) => {
        if (message) {
          set({ lastError: message });
        }
      },
    });
  };

  const findStaleFugleSymbols = (symbols: string[], now = Date.now()): string[] => {
    const state = get();
    const {
      fugleEnabled,
      fugleApiKey,
    } = useSettingsStore.getState();

    if (!fugleEnabled || !fugleApiKey || !state._fugleConnected) {
      return [];
    }

    return symbols.filter(symbol => {
      const quote = state.quotes[symbol];
      if (!quote || quote.source !== 'fugle_live') {
        return false;
      }
      const lastTradeAt =
        state._lastFugleTradeAtBySymbol[symbol] ??
        quote.sourceUpdatedAt ??
        quote.fetchedAt;
      return now - lastTradeAt >= FUGLE_STALE_AFTER_MS;
    });
  };

  const scheduleNextPoll = (generation: number) => {
    if (!get().polling || get()._pollGeneration !== generation) return;
    clearPollTimer();
    const timeoutId = setTimeout(() => {
      void runPollLoop(generation);
    }, POLL_LOOP_INTERVAL_MS);
    set({ _pollTimeoutId: timeoutId });
  };

  const runPollLoop = async (generation: number) => {
    if (!get().polling || get()._pollGeneration !== generation) return;
    if (get()._pollInFlight) {
      scheduleNextPoll(generation);
      return;
    }

    const symbols = get()._pollSymbols;
    set({ _pollInFlight: true });

    let run!: Promise<void>;
    run = (async () => {
      try {
        if (!isMarketOpen()) {
          await refreshQuotes(symbols, {}, {
            preserveMarketOpenCarryForward: false,
            updateRestTimestamp: true,
          });
          get().stopPolling();
          return;
        }

        connectFugleIfNeeded(symbols);

        const {
          fugleEnabled,
          fugleApiKey,
        } = useSettingsStore.getState();
        const fugleActive = Boolean(fugleEnabled && fugleApiKey);
        const now = Date.now();

        if (get()._lastRestRefreshAt === 0) {
          await refreshQuotes(symbols, {
            forceNetwork: true,
            forceFugleLookup: fugleActive,
            forceFugleNetwork: fugleActive,
          }, {
            preserveMarketOpenCarryForward: false,
            updateRestTimestamp: true,
            updateFugleBootstrapAt: fugleActive,
            treatEmptyAsError: false,
          });
        } else {
          const staleSymbols = findStaleFugleSymbols(symbols, now);
          if (
            staleSymbols.length > 0 &&
            now - get()._lastFugleStaleRefreshAt >= FUGLE_STALE_REFRESH_INTERVAL_MS
          ) {
            await refreshQuotes(staleSymbols, {
              forceFugleLookup: true,
              forceFugleNetwork: true,
            }, {
              preserveMarketOpenCarryForward: true,
              updateFugleStaleRefreshAt: true,
              fugleRefreshSymbols: staleSymbols,
            });
          }

          if (now - get()._lastRestRefreshAt >= REST_POLL_INTERVAL_MS) {
            await refreshQuotes(symbols, {}, {
              preserveMarketOpenCarryForward: true,
              updateRestTimestamp: true,
            });
          }
        }
      } catch (e) {
        set({ lastError: String(e) });
        markSymbolsStale(findStaleFugleSymbols(get()._pollSymbols));
      } finally {
        const stillCurrent = get()._pollGeneration === generation;
        set({ _pollInFlight: false });
        if (activePollRun === run) {
          activePollRun = null;
        }
        if (stillCurrent) {
          scheduleNextPoll(generation);
        }
      }
    })();

    activePollRun = run;
    await run;
  };

  return {
    quotes: {},
    tickHistory: {},
    polling: false,
    lastError: null,
    _pollTimeoutId: null,
    _pollGeneration: 0,
    _pollInFlight: false,
    _pollSymbols: [],
    _lastRestRefreshAt: 0,
    _lastFugleBootstrapAt: 0,
    _lastFugleStaleRefreshAt: 0,
    _lastFugleTradeAtBySymbol: {},
    _fugleConnected: false,

    async loadPersistedQuotes(symbols: string[]) {
      const rows = await loadPersistedQuotesFromDb(symbols);
      if (rows.length === 0) return;

      set((state) => {
        const nextQuotes = { ...state.quotes };
        for (const row of rows) {
          const hydrated: Quote = {
            symbol: row.symbol,
            name: row.name,
            price: row.price,
            prevClose: row.prevClose,
            open: row.open,
            high: row.high,
            low: row.low,
            volume: row.volume,
            change: row.change,
            changePct: row.changePct,
            fetchedAt: row.fetchedAt,
            bid: row.bid,
            ask: row.ask,
            source: row.source,
            sourceUpdatedAt: row.sourceUpdatedAt,
            freshnessState: isLiveSource(row.source) ? 'stale' : row.freshnessState,
          };
          nextQuotes[row.symbol] = mergeQuotes(nextQuotes[row.symbol], hydrated);
        }
        return { quotes: nextQuotes };
      });
    },

    async persistQuotes(symbols: string[] = Object.keys(get().quotes)) {
      await persistQuotesNow(symbols);
    },

    startPolling(symbols: string[]) {
      if (get().polling) return;
      if (!isMarketOpen()) {
        set({ polling: false });
        return;
      }

      const nextGeneration = get()._pollGeneration + 1;
      set({
        polling: true,
        _pollGeneration: nextGeneration,
        _pollSymbols: Array.from(new Set(symbols)),
        _lastRestRefreshAt: 0,
        _lastFugleBootstrapAt: 0,
        _lastFugleStaleRefreshAt: 0,
        _lastFugleTradeAtBySymbol: {},
      });

      void runPollLoop(nextGeneration);
    },

    stopPolling() {
      const symbolsToPersist = get()._pollSymbols.length > 0
        ? get()._pollSymbols
        : Object.keys(get().quotes);
      void persistQuotesNow(symbolsToPersist);
      disconnectFugleWatchlistStream();
      clearPollTimer();
      set((state) => ({
        polling: false,
        _pollGeneration: state._pollGeneration + 1,
        _pollInFlight: false,
        _pollSymbols: [],
        _lastRestRefreshAt: 0,
        _lastFugleBootstrapAt: 0,
        _lastFugleStaleRefreshAt: 0,
        _lastFugleTradeAtBySymbol: {},
        _fugleConnected: false,
        tickHistory: {},
      }));
    },

    async forceRefresh(symbols: string[], options: QuoteFetchOptions = {}) {
      try {
        await waitForPollIdle();

        await refreshQuotes(symbols, options, {
          preserveMarketOpenCarryForward: true,
          updateRestTimestamp: true,
          treatEmptyAsError: true,
          updateFugleBootstrapAt: Boolean(options.forceFugleLookup),
          updateFugleStaleRefreshAt: Boolean(options.forceFugleLookup),
          fugleRefreshSymbols: options.forceFugleLookup ? symbols : undefined,
        });
      } catch (e) {
        set({ lastError: String(e) });
      }
    },
  };
});

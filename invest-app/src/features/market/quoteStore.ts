import { create } from 'zustand';
import { checkAlerts } from '../alerts/services/alertMonitor';
import { getQuotes } from '../../services/stockService';
import { isMarketOpen } from './marketHours';

interface Quote {
  symbol: string;
  name: string;
  price: number | null;
  prevClose: number;
  change: number;
  changePct: number;
  fetchedAt: number;
}

interface QuoteState {
  quotes: Record<string, Quote>;
  tickHistory: Record<string, number[]>;
  polling: boolean;
  lastError: string | null;
  _intervalId: ReturnType<typeof setInterval> | null;
  startPolling: (symbols: string[]) => void;
  stopPolling: () => void;
  forceRefresh: (symbols: string[]) => Promise<void>;
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
          const quotes: Record<string, Quote> = {};
          for (const q of raw) {
            const change = q.price !== null ? q.price - q.prevClose : 0;
            const changePct = q.price !== null ? (change / q.prevClose) * 100 : 0;
            quotes[q.symbol] = {
              symbol: q.symbol,
              name: q.name,
              price: q.price,
              prevClose: q.prevClose,
              change,
              changePct,
              fetchedAt,
            };
          }
          const tickHistory = { ...get().tickHistory };
          for (const q of raw) {
            if (q.price !== null) {
              const prev = tickHistory[q.symbol] ?? [];
              tickHistory[q.symbol] = [...prev, q.price];
            }
          }
          set({ quotes: { ...get().quotes, ...quotes }, tickHistory });
        } catch (e) {
          set({ lastError: String(e) });
        }
        get().stopPolling();
        return;
      }

      try {
        const raw = await getQuotes(symbols);
        const fetchedAt = Date.now();
        const quotes: Record<string, Quote> = {};
        for (const q of raw) {
          const change = q.price !== null ? q.price - q.prevClose : 0;
          const changePct = q.price !== null ? (change / q.prevClose) * 100 : 0;
          quotes[q.symbol] = {
            symbol: q.symbol,
            name: q.name,
            price: q.price,
            prevClose: q.prevClose,
            change,
            changePct,
            fetchedAt,
          };
        }
        const tickHistory = { ...get().tickHistory };
        for (const q of raw) {
          if (q.price !== null) {
            const prev = tickHistory[q.symbol] ?? [];
            tickHistory[q.symbol] = [...prev, q.price];
          }
        }
        set({ quotes: { ...get().quotes, ...quotes }, tickHistory });
        checkAlerts(quotes).catch(() => {});
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

  async forceRefresh(symbols: string[]) {
    try {
      const raw = await getQuotes(symbols);
      const fetchedAt = Date.now();
      const quotesUpdate: Record<string, Quote> = {};
      const tickHistory = { ...get().tickHistory };
      for (const q of raw) {
        if (q.price === null) {
          if (!get().quotes[q.symbol]) {
            // Cold start with no cached price — show prevClose so card isn't blank
            quotesUpdate[q.symbol] = {
              symbol: q.symbol,
              name: q.name,
              price: q.prevClose,
              prevClose: q.prevClose,
              change: 0,
              changePct: 0,
              fetchedAt,
            };
          }
          // else: cached price exists — keep it, don't overwrite with null
          continue;
        }
        const change = q.price - q.prevClose;
        const changePct = (change / q.prevClose) * 100;
        quotesUpdate[q.symbol] = {
          symbol: q.symbol,
          name: q.name,
          price: q.price,
          prevClose: q.prevClose,
          change,
          changePct,
          fetchedAt,
        };
        tickHistory[q.symbol] = [...(tickHistory[q.symbol] ?? []), q.price];
      }
      set({ quotes: { ...get().quotes, ...quotesUpdate }, tickHistory });
    } catch (e) {
      set({ lastError: String(e) });
    }
  },
}));

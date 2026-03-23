import { create } from 'zustand';
import { callMiniMax, QuoteData } from '../services/minimaxApi';
import { fetchLatestQuoteForSummary } from '../../summary/services/summaryService';
import { AnalysisResult } from '../types';

const TTL_MS = 30 * 60 * 1000;

interface Credentials {
  apiKey: string;
  modelName: string;
  baseUrl: string;
}

interface AnalysisState {
  cache: Record<string, AnalysisResult>;
  cachedAt: Record<string, number>;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  fetchAnalysis: (symbol: string, quote: QuoteData, credentials: Credentials) => Promise<void>;
  clearAnalysis: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  cache: {},
  cachedAt: {},
  loading: {},
  errors: {},

  async fetchAnalysis(symbol, quote, credentials) {
    const cachedAt = get().cachedAt[symbol] ?? 0;
    if (get().cache[symbol] && Date.now() - cachedAt < TTL_MS) return;

    set(s => ({
      loading: { ...s.loading, [symbol]: true },
      errors: { ...s.errors, [symbol]: null },
    }));

    try {
      // Always try STOCK_DAY first — gives full OHLCV + MA5/MA20/volumeRatio
      const fresh = await fetchLatestQuoteForSummary(symbol);
      let effectiveQuote: QuoteData;
      if (fresh) {
        effectiveQuote = {
          name: quote.name,
          price: fresh.price,
          change: fresh.change,
          changePct: fresh.changePct,
          prevClose: fresh.prevClose,
          volume: fresh.volume,
          open: fresh.open,
          high: fresh.high,
          low: fresh.low,
          volumeRatio: fresh.volumeRatio,
          ma5: fresh.ma5,
          ma20: fresh.ma20,
        };
      } else {
        effectiveQuote = quote;
      }

      if (effectiveQuote.price == null) {
        set(s => ({
          loading: { ...s.loading, [symbol]: false },
          errors: { ...s.errors, [symbol]: '等待行情資料，請稍後重試' },
        }));
        return;
      }

      const result = await callMiniMax(symbol, effectiveQuote, credentials);
      set(s => ({
        cache: { ...s.cache, [symbol]: result },
        cachedAt: { ...s.cachedAt, [symbol]: Date.now() },
        loading: { ...s.loading, [symbol]: false },
        errors: { ...s.errors, [symbol]: null },
      }));
    } catch (e) {
      set(s => ({
        loading: { ...s.loading, [symbol]: false },
        errors: { ...s.errors, [symbol]: String(e) },
      }));
    }
  },

  clearAnalysis() {
    set({ cache: {}, cachedAt: {}, loading: {}, errors: {} });
  },
}));

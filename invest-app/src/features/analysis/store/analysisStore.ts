import { create } from 'zustand';
import { callMiniMax, QuoteData } from '../services/minimaxApi';
import { fetchLatestQuoteForSummary, mergeQuoteData } from '../../summary/services/summaryService';
import { AnalysisResult } from '../types';
import { useQuoteStore } from '../../market/quoteStore';
import { isMarketOpen } from '../../market/marketHours';

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
      await useQuoteStore.getState().forceRefresh([symbol]);
      const liveQuote = useQuoteStore.getState().quotes[symbol];
      const fresh = await fetchLatestQuoteForSummary(symbol);
      const merged = mergeQuoteData(liveQuote ?? quote, fresh, isMarketOpen());

      const effectiveQuote: QuoteData = merged
        ? {
            name: quote.name,
            price: merged.price,
            change: merged.change,
            changePct: merged.changePct,
            prevClose: merged.prevClose,
            volume: merged.volume,
            open: merged.open,
            high: merged.high,
            low: merged.low,
            volumeRatio: merged.volumeRatio,
            ma5: merged.ma5,
            ma20: merged.ma20,
          }
        : quote;

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

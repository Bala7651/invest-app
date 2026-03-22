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
      // If price is unavailable (market closed / not yet fetched), get fresh TWSE data
      let effectiveQuote = quote;
      if (quote.price == null || quote.price === 0) {
        const fresh = await fetchLatestQuoteForSummary(symbol);
        if (fresh) {
          effectiveQuote = { ...quote, price: fresh.price, change: fresh.change, changePct: fresh.changePct, prevClose: fresh.prevClose };
        }
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

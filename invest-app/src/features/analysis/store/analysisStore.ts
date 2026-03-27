import { create } from 'zustand';
import { callMiniMax, QuoteData } from '../services/minimaxApi';
import { mergeQuoteData } from '../../summary/services/summaryService';
import { AnalysisResult } from '../types';
import { useQuoteStore } from '../../market/quoteStore';
import { isMarketOpen } from '../../market/marketHours';
import { tFromStore } from '../../i18n/useI18n';
import { useSettingsStore } from '../../settings/store/settingsStore';
import {
  clearPersistedAnalyses,
  loadPersistedAnalyses,
  upsertPersistedAnalysis,
} from '../services/analysisCacheService';

interface Credentials {
  apiKey: string;
  modelName: string;
  baseUrl: string;
}

interface FetchOptions {
  force?: boolean;
}

interface AnalysisState {
  cache: Record<string, AnalysisResult>;
  cachedAt: Record<string, number>;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  hydrated: boolean;
  loadPersistedAnalysis: () => Promise<void>;
  fetchAnalysis: (
    symbol: string,
    quote: QuoteData,
    credentials: Credentials,
    options?: FetchOptions,
  ) => Promise<void>;
  clearAnalysis: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  cache: {},
  cachedAt: {},
  loading: {},
  errors: {},
  hydrated: false,

  async loadPersistedAnalysis() {
    if (get().hydrated) return;

    const persisted = await loadPersistedAnalyses();
    const cache: Record<string, AnalysisResult> = {};
    const cachedAt: Record<string, number> = {};

    for (const entry of persisted) {
      cache[entry.symbol] = entry.result;
      cachedAt[entry.symbol] = entry.cachedAt;
    }

    set((s) => ({
      cache: { ...cache, ...s.cache },
      cachedAt: { ...cachedAt, ...s.cachedAt },
      hydrated: true,
    }));
  },

  async fetchAnalysis(symbol, quote, credentials, options) {
    if (!options?.force && get().cache[symbol]) return;

    set(s => ({
      loading: { ...s.loading, [symbol]: true },
      errors: { ...s.errors, [symbol]: null },
    }));

    try {
      const liveQuote = useQuoteStore.getState().quotes[symbol];
      const merged = mergeQuoteData(liveQuote ?? null, null, isMarketOpen());

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
          errors: { ...s.errors, [symbol]: tFromStore('common.priceFallbackRefreshFirst') },
        }));
        return;
      }

      const result = await callMiniMax(
        symbol,
        effectiveQuote,
        credentials,
        useSettingsStore.getState().language,
      );
      const fetchedAt = Date.now();
      await upsertPersistedAnalysis(symbol, result, fetchedAt);

      set(s => ({
        cache: { ...s.cache, [symbol]: result },
        cachedAt: { ...s.cachedAt, [symbol]: fetchedAt },
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
    set({ cache: {}, cachedAt: {}, loading: {}, errors: {}, hydrated: false });
    void clearPersistedAnalyses();
  },
}));

import { create } from 'zustand';
import { fetchCandles as fetchCandlesService } from '../services/historicalService';
import { ChartProvider, OHLCVPoint, SelectableChartProvider, Timeframe } from '../types';

interface ChartState {
  cache: Record<string, OHLCVPoint[]>;
  providers: Record<string, SelectableChartProvider>;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  fetchCandles: (symbol: string, timeframe: Timeframe, provider?: ChartProvider) => Promise<void>;
  getCandles: (symbol: string, timeframe: Timeframe, provider?: ChartProvider) => OHLCVPoint[] | undefined;
  getProviderUsed: (symbol: string, timeframe: Timeframe, provider?: ChartProvider) => SelectableChartProvider | undefined;
  clearCache: (symbol?: string) => void;
}

export const useChartStore = create<ChartState>((set, get) => ({
  cache: {},
  providers: {},
  loading: {},
  errors: {},

  async fetchCandles(symbol: string, timeframe: Timeframe, provider: ChartProvider = 'auto') {
    const key = `${symbol}:${timeframe}:${provider}`;
    if (timeframe !== '1D' && get().cache[key] !== undefined) return;

    set(state => ({ loading: { ...state.loading, [key]: true } }));
    try {
      const result = await fetchCandlesService(symbol, timeframe, provider);
      set(state => ({
        cache: { ...state.cache, [key]: result.points },
        providers: { ...state.providers, [key]: result.providerUsed },
        loading: { ...state.loading, [key]: false },
        errors: { ...state.errors, [key]: null },
      }));
    } catch (e) {
      set(state => ({
        loading: { ...state.loading, [key]: false },
        errors: { ...state.errors, [key]: String(e) },
      }));
    }
  },

  getCandles(symbol: string, timeframe: Timeframe, provider: ChartProvider = 'auto') {
    return get().cache[`${symbol}:${timeframe}:${provider}`];
  },

  getProviderUsed(symbol: string, timeframe: Timeframe, provider: ChartProvider = 'auto') {
    return get().providers[`${symbol}:${timeframe}:${provider}`];
  },

  clearCache(symbol?: string) {
    if (symbol) {
      set(state => {
        const cache = { ...state.cache };
        const providers = { ...state.providers };
        for (const key of Object.keys(cache)) {
          if (key.startsWith(`${symbol}:`)) {
            delete cache[key];
            delete providers[key];
          }
        }
        return { cache, providers };
      });
    } else {
      set({ cache: {}, providers: {} });
    }
  },
}));

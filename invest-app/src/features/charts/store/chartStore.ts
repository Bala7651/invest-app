import { create } from 'zustand';
import { fetchCandles as fetchCandlesService } from '../services/historicalService';
import { OHLCVPoint, Timeframe } from '../types';

interface ChartState {
  cache: Record<string, OHLCVPoint[]>;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  fetchCandles: (symbol: string, timeframe: Timeframe) => Promise<void>;
  getCandles: (symbol: string, timeframe: Timeframe) => OHLCVPoint[] | undefined;
  clearCache: (symbol?: string) => void;
}

export const useChartStore = create<ChartState>((set, get) => ({
  cache: {},
  loading: {},
  errors: {},

  async fetchCandles(symbol: string, timeframe: Timeframe) {
    const key = `${symbol}:${timeframe}`;
    if (timeframe !== '1D' && get().cache[key] !== undefined) return;

    set(state => ({ loading: { ...state.loading, [key]: true } }));
    try {
      const data = await fetchCandlesService(symbol, timeframe);
      set(state => ({
        cache: { ...state.cache, [key]: data },
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

  getCandles(symbol: string, timeframe: Timeframe) {
    return get().cache[`${symbol}:${timeframe}`];
  },

  clearCache(symbol?: string) {
    if (symbol) {
      set(state => {
        const cache = { ...state.cache };
        for (const key of Object.keys(cache)) {
          if (key.startsWith(`${symbol}:`)) delete cache[key];
        }
        return { cache };
      });
    } else {
      set({ cache: {} });
    }
  },
}));

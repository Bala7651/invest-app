import { create } from 'zustand';
import { useWatchlistStore } from '../../watchlist/store/watchlistStore';
import { useQuoteStore } from '../../market/quoteStore';
import {
  getTodayISO,
  fetchTWIX,
  buildSummaryPrompt,
  buildIndexSummaryPrompt,
  callSummaryMiniMax,
  upsertSummary,
  purgeOldSummaries,
  loadAllSummaries,
} from '../services/summaryService';
import { Credentials, ERROR_PREFIX, SummaryEntry } from '../types';

interface SummaryState {
  generating: boolean;
  progress: { done: number; total: number };
  errors: Record<string, string | null>;
  summariesByDate: Record<string, SummaryEntry[]>;
  loadSummaries: () => Promise<void>;
  generateToday: (credentials: Credentials) => Promise<void>;
}

export const useSummaryStore = create<SummaryState>((set, get) => ({
  generating: false,
  progress: { done: 0, total: 0 },
  errors: {},
  summariesByDate: {},

  async loadSummaries() {
    const rows = await loadAllSummaries();
    const byDate: Record<string, SummaryEntry[]> = {};
    for (const row of rows) {
      if (!byDate[row.date]) {
        byDate[row.date] = [];
      }
      byDate[row.date].push(row);
    }
    set({ summariesByDate: byDate });
  },

  async generateToday(credentials: Credentials) {
    if (get().generating) return;

    const date = getTodayISO();
    const watchlistItems = useWatchlistStore.getState().items;
    const quotes = useQuoteStore.getState().quotes;
    const total = watchlistItems.length + 1; // +1 for TAIEX index

    set({ generating: true, progress: { done: 0, total }, errors: {} });

    // Step 1: TAIEX index
    try {
      const indexData = await fetchTWIX();
      if (indexData) {
        const userPrompt = buildIndexSummaryPrompt(indexData);
        const content = await callSummaryMiniMax('TWSE', userPrompt, credentials);
        await upsertSummary('TWSE', date, content);
      } else {
        await upsertSummary('TWSE', date, `${ERROR_PREFIX}無法取得大盤資料`);
        set(s => ({ errors: { ...s.errors, 'TWSE': '無法取得大盤資料' } }));
      }
    } catch (e) {
      const msg = String(e);
      await upsertSummary('TWSE', date, `${ERROR_PREFIX}${msg}`);
      set(s => ({ errors: { ...s.errors, 'TWSE': msg } }));
    }
    set(s => ({ progress: { ...s.progress, done: s.progress.done + 1 } }));

    // Step 2: Per-stock loop (sequential)
    for (const item of watchlistItems) {
      try {
        const q = quotes[item.symbol];
        const quoteData = q
          ? { price: q.price, change: q.change, changePct: q.changePct, prevClose: q.prevClose }
          : { price: null, change: 0, changePct: 0, prevClose: 0 };
        const userPrompt = buildSummaryPrompt(item.symbol, item.name, quoteData);
        const content = await callSummaryMiniMax(item.symbol, userPrompt, credentials);
        await upsertSummary(item.symbol, date, content);
      } catch (e) {
        const msg = String(e);
        await upsertSummary(item.symbol, date, `${ERROR_PREFIX}${msg}`);
        set(s => ({ errors: { ...s.errors, [item.symbol]: msg } }));
      }
      set(s => ({ progress: { ...s.progress, done: s.progress.done + 1 } }));
    }

    // Step 3: Purge old summaries
    await purgeOldSummaries();

    // Step 4: Reload from DB
    await get().loadSummaries();

    set({ generating: false });
  },
}));

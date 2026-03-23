import { create } from 'zustand';
import { useWatchlistStore } from '../../watchlist/store/watchlistStore';
import { useQuoteStore } from '../../market/quoteStore';
import {
  getTodayISO,
  fetchTWIX,
  fetchLatestQuoteForSummary,
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
        const raw = await callSummaryMiniMax('TWSE', userPrompt, credentials);
        const content = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        if (!content) throw new Error('AI 回應為空');
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
        // Always try fresh TWSE data first; fall back to in-memory quote
        const q = quotes[item.symbol];
        const freshQuote = await fetchLatestQuoteForSummary(item.symbol);
        const quoteData = freshQuote
          ?? (q ? {
               price: q.price,
               open: q.open,
               high: q.high,
               low: q.low,
               volume: q.volume,
               change: q.change,
               changePct: q.changePct,
               prevClose: q.prevClose,
               ma5: null, ma20: null, avgVolume20: null, volumeRatio: null,
             }
             : { price: null, open: null, high: null, low: null, volume: null,
                 change: 0, changePct: 0, prevClose: 0,
                 ma5: null, ma20: null, avgVolume20: null, volumeRatio: null });
        if (quoteData.price == null) {
          await upsertSummary(item.symbol, date, `${ERROR_PREFIX}無法取得股價資料，請於收盤後重試`);
          set(s => ({ errors: { ...s.errors, [item.symbol]: '無法取得股價資料' } }));
        } else {
          const userPrompt = buildSummaryPrompt(item.symbol, item.name, quoteData);
          const raw = await callSummaryMiniMax(item.symbol, userPrompt, credentials);
          const content = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
          if (!content) throw new Error('AI 回應為空');
          await upsertSummary(item.symbol, date, content);
        }
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

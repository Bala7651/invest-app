import { create } from 'zustand';
import {
  upsertHolding,
  getAllHoldings,
  deleteHolding,
  HoldingRow,
} from '../services/holdingsService';
import { PortfolioAnalysis, ChatMessage } from '../services/portfolioAiService';
import {
  loadPortfolioAiState,
  savePortfolioAiState,
} from '../services/portfolioStateService';

interface HoldingsState {
  holdings: Record<string, HoldingRow>;
  loading: boolean;
  error: string | null;
  lastAnalysis: PortfolioAnalysis | null;
  chatHistory: ChatMessage[];
  loadHoldings: () => Promise<void>;
  setQuantity: (symbol: string, name: string, quantity: number) => Promise<void>;
  clearHoldings: () => void;
  setLastAnalysis: (result: PortfolioAnalysis | null) => void;
  setChatHistory: (history: ChatMessage[]) => void;
  appendChatMessage: (msg: ChatMessage) => void;
  clearChatHistory: () => void;
}

export const useHoldingsStore = create<HoldingsState>((set) => ({
  holdings: {},
  loading: false,
  error: null,
  lastAnalysis: null,
  chatHistory: [],

  loadHoldings: async () => {
    set({ loading: true, error: null });
    try {
      const [rows, aiState] = await Promise.all([
        getAllHoldings(),
        loadPortfolioAiState(),
      ]);
      const map: Record<string, HoldingRow> = {};
      for (const row of rows) {
        map[row.symbol] = row;
      }
      set({
        holdings: map,
        lastAnalysis: aiState.lastAnalysis,
        chatHistory: aiState.chatHistory,
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: String(e) });
    }
  },

  setQuantity: async (symbol: string, name: string, quantity: number) => {
    if (quantity > 0) {
      await upsertHolding(symbol, name, quantity);
      set((state) => ({
        holdings: {
          ...state.holdings,
          [symbol]: {
            ...state.holdings[symbol],
            id: state.holdings[symbol]?.id ?? 0,
            symbol,
            name,
            quantity,
            created_at: state.holdings[symbol]?.created_at ?? null,
            updated_at: null,
          },
        },
      }));
    } else {
      await deleteHolding(symbol);
      set((state) => {
        const next = { ...state.holdings };
        delete next[symbol];
        return { holdings: next };
      });
    }
  },

  clearHoldings: () => set({ holdings: {} }),

  setLastAnalysis: (result) =>
    set((state) => {
      void savePortfolioAiState(result, state.chatHistory);
      return { lastAnalysis: result };
    }),
  setChatHistory: (history) =>
    set((state) => {
      void savePortfolioAiState(state.lastAnalysis, history);
      return { chatHistory: history };
    }),
  appendChatMessage: (msg) =>
    set((state) => {
      const nextHistory = [...state.chatHistory, msg];
      void savePortfolioAiState(state.lastAnalysis, nextHistory);
      return { chatHistory: nextHistory };
    }),
  clearChatHistory: () =>
    set((state) => {
      void savePortfolioAiState(state.lastAnalysis, []);
      return { chatHistory: [] };
    }),
}));

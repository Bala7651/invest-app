import { create } from 'zustand';
import {
  upsertHolding,
  getAllHoldings,
  deleteHolding,
  HoldingRow,
} from '../services/holdingsService';
import { PortfolioAnalysis, ChatMessage, SuggestedQuestionsSource } from '../services/portfolioAiService';
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
  suggestedQuestions: string[];
  suggestedQuestionsSource: SuggestedQuestionsSource;
  loadHoldings: () => Promise<void>;
  setQuantity: (symbol: string, name: string, quantity: number) => Promise<void>;
  setEntryPrice: (symbol: string, name: string, entryPrice: number | null) => Promise<void>;
  clearHoldings: () => void;
  setLastAnalysis: (result: PortfolioAnalysis | null) => void;
  setChatHistory: (history: ChatMessage[]) => void;
  setSuggestedQuestions: (questions: string[], source?: SuggestedQuestionsSource) => void;
  setPortfolioAiState: (
    state: {
      lastAnalysis: PortfolioAnalysis | null;
      chatHistory: ChatMessage[];
      suggestedQuestions: string[];
      suggestedQuestionsSource: SuggestedQuestionsSource;
    }
  ) => void;
  appendChatMessage: (msg: ChatMessage) => void;
  clearChatHistory: () => void;
}

export const useHoldingsStore = create<HoldingsState>((set) => ({
  holdings: {},
  loading: false,
  error: null,
  lastAnalysis: null,
  chatHistory: [],
  suggestedQuestions: [],
  suggestedQuestionsSource: 'ai',

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
        suggestedQuestions: aiState.suggestedQuestions,
        suggestedQuestionsSource: aiState.suggestedQuestionsSource,
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: String(e) });
    }
  },

  setQuantity: async (symbol: string, name: string, quantity: number) => {
    const existing = useHoldingsStore.getState().holdings[symbol];
    if (quantity > 0) {
      await upsertHolding(symbol, name, quantity, existing?.entry_price ?? null);
      set((state) => ({
        holdings: {
          ...state.holdings,
          [symbol]: {
            ...state.holdings[symbol],
            id: state.holdings[symbol]?.id ?? 0,
            symbol,
            name,
            quantity,
            entry_price: state.holdings[symbol]?.entry_price ?? null,
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

  setEntryPrice: async (symbol: string, name: string, entryPrice: number | null) => {
    const existing = useHoldingsStore.getState().holdings[symbol];
    if (!existing) return;

    await upsertHolding(symbol, name, existing.quantity, entryPrice);
    set((state) => ({
      holdings: {
        ...state.holdings,
        [symbol]: {
          ...state.holdings[symbol],
          id: state.holdings[symbol]?.id ?? existing.id ?? 0,
          symbol,
          name,
          quantity: state.holdings[symbol]?.quantity ?? existing.quantity,
          entry_price: entryPrice,
          created_at: state.holdings[symbol]?.created_at ?? existing.created_at ?? null,
          updated_at: null,
        },
      },
    }));
  },

  clearHoldings: () => set({ holdings: {} }),

  setLastAnalysis: (result) =>
    set((state) => {
      void savePortfolioAiState(result, state.chatHistory, state.suggestedQuestions, state.suggestedQuestionsSource);
      return { lastAnalysis: result };
    }),
  setChatHistory: (history) =>
    set((state) => {
      void savePortfolioAiState(state.lastAnalysis, history, state.suggestedQuestions, state.suggestedQuestionsSource);
      return { chatHistory: history };
    }),
  setSuggestedQuestions: (questions, source = 'ai') =>
    set((state) => {
      const nextQuestions = questions.slice(0, 5);
      void savePortfolioAiState(state.lastAnalysis, state.chatHistory, nextQuestions, source);
      return { suggestedQuestions: nextQuestions, suggestedQuestionsSource: source };
    }),
  setPortfolioAiState: (nextState) =>
    set(() => {
      const suggestedQuestions = nextState.suggestedQuestions.slice(0, 5);
      void savePortfolioAiState(
        nextState.lastAnalysis,
        nextState.chatHistory,
        suggestedQuestions,
        nextState.suggestedQuestionsSource,
      );
      return {
        lastAnalysis: nextState.lastAnalysis,
        chatHistory: nextState.chatHistory,
        suggestedQuestions,
        suggestedQuestionsSource: nextState.suggestedQuestionsSource,
      };
    }),
  appendChatMessage: (msg) =>
    set((state) => {
      const nextHistory = [...state.chatHistory, msg];
      void savePortfolioAiState(state.lastAnalysis, nextHistory, state.suggestedQuestions, state.suggestedQuestionsSource);
      return { chatHistory: nextHistory };
    }),
  clearChatHistory: () =>
    set((state) => {
      void savePortfolioAiState(state.lastAnalysis, [], state.suggestedQuestions, state.suggestedQuestionsSource);
      return { chatHistory: [] };
    }),
}));

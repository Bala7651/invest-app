import { create } from 'zustand';
import * as watchlistService from '../../../services/watchlistService';
import { useQuoteStore } from '../../market/quoteStore';
import { isMarketOpen } from '../../market/marketHours';

export interface WatchlistItem {
  id: number;
  symbol: string;
  name: string;
  sort_order: number;
}

interface WatchlistState {
  items: WatchlistItem[];
  setItems: (items: WatchlistItem[]) => void;
  addItem: (symbol: string, name: string) => Promise<void>;
  removeItem: (id: number) => Promise<void>;
  loadFromDb: () => Promise<void>;
  reorderItems: (fromIndex: number, toIndex: number) => void;
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  items: [],

  setItems: (items) => set({ items }),

  async addItem(symbol: string, name: string) {
    if (get().items.some(i => i.symbol === symbol)) return;
    const item = await watchlistService.insertItem(symbol, name);
    set(state => ({ items: [...state.items, item] }));
    const symbols = get().items.map(i => i.symbol);
    const quoteStore = useQuoteStore.getState();
    await quoteStore.forceRefresh([symbol]);
    quoteStore.stopPolling();
    if (symbols.length > 0 && isMarketOpen()) {
      quoteStore.startPolling(symbols);
    }
  },

  async removeItem(id: number) {
    await watchlistService.deleteItem(id);
    const updated = get().items
      .filter(i => i.id !== id)
      .map((item, index) => ({ ...item, sort_order: index }));
    set({ items: updated });
    const symbols = updated.map(i => i.symbol);
    useQuoteStore.getState().stopPolling();
    if (symbols.length > 0 && isMarketOpen()) {
      useQuoteStore.getState().startPolling(symbols);
    }
  },

  async loadFromDb() {
    const rows = await watchlistService.getAll();
    set({ items: rows });
  },

  reorderItems(fromIndex: number, toIndex: number) {
    const items = [...get().items];
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    const reindexed = items.map((item, index) => ({ ...item, sort_order: index }));
    set({ items: reindexed });
    watchlistService.updateSortOrders(
      reindexed.map(i => ({ id: i.id, sort_order: i.sort_order }))
    );
  },
}));

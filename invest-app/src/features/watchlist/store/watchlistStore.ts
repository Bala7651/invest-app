import { create } from 'zustand';

export interface WatchlistItem {
  id: number;
  symbol: string;
  name: string;
  sort_order: number;
}

interface WatchlistState {
  items: WatchlistItem[];
  setItems: (items: WatchlistItem[]) => void;
  addItem: (item: WatchlistItem) => void;
  removeItem: (id: number) => void;
}

export const useWatchlistStore = create<WatchlistState>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
}));

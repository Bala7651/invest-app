import { useWatchlistStore } from '../features/watchlist/store/watchlistStore';

jest.mock('../services/watchlistService', () => ({
  getAll: jest.fn(),
  insertItem: jest.fn(),
  deleteItem: jest.fn(),
  updateSortOrders: jest.fn(),
}));

jest.mock('../features/market/quoteStore', () => ({
  useQuoteStore: {
    getState: jest.fn(() => ({
      startPolling: jest.fn(),
      stopPolling: jest.fn(),
      forceRefresh: jest.fn(),
    })),
  },
}));

jest.mock('../features/market/marketHours', () => ({
  isMarketOpen: jest.fn(() => false),
}));

import * as watchlistService from '../services/watchlistService';
import { useQuoteStore } from '../features/market/quoteStore';

const mockGetAll = watchlistService.getAll as jest.MockedFunction<typeof watchlistService.getAll>;
const mockInsertItem = watchlistService.insertItem as jest.MockedFunction<typeof watchlistService.insertItem>;
const mockDeleteItem = watchlistService.deleteItem as jest.MockedFunction<typeof watchlistService.deleteItem>;
const mockUpdateSortOrders = watchlistService.updateSortOrders as jest.MockedFunction<typeof watchlistService.updateSortOrders>;
const mockQuoteStore = {
  startPolling: jest.fn(),
  stopPolling: jest.fn(),
  forceRefresh: jest.fn(),
};

beforeEach(() => {
  useWatchlistStore.setState({ items: [] });
  jest.clearAllMocks();
  mockUpdateSortOrders.mockResolvedValue(undefined);
  mockDeleteItem.mockResolvedValue(undefined);
  mockQuoteStore.startPolling.mockReset();
  mockQuoteStore.stopPolling.mockReset();
  mockQuoteStore.forceRefresh.mockReset();
  mockQuoteStore.forceRefresh.mockResolvedValue(undefined);
  (useQuoteStore.getState as jest.Mock).mockReturnValue(mockQuoteStore);
});

describe('watchlistStore', () => {
  describe('loadFromDb', () => {
    test('hydrates items from SQLite ordered by sort_order', async () => {
      const dbItems = [
        { id: 1, symbol: '2330', name: '台灣積體電路製造', sort_order: 0 },
        { id: 2, symbol: '2317', name: '鴻海精密工業', sort_order: 1 },
      ];
      mockGetAll.mockResolvedValue(dbItems);

      await useWatchlistStore.getState().loadFromDb();

      const items = useWatchlistStore.getState().items;
      expect(items).toHaveLength(2);
      expect(items[0].symbol).toBe('2330');
      expect(items[1].symbol).toBe('2317');
    });

    test('sets empty items when db is empty', async () => {
      mockGetAll.mockResolvedValue([]);

      await useWatchlistStore.getState().loadFromDb();

      expect(useWatchlistStore.getState().items).toHaveLength(0);
    });
  });

  describe('addItem', () => {
    test('inserts into SQLite and updates state', async () => {
      const returned = { id: 1, symbol: '2330', name: '台灣積體電路製造', sort_order: 0 };
      mockInsertItem.mockResolvedValue(returned);

      await useWatchlistStore.getState().addItem('2330', '台灣積體電路製造');

      expect(mockInsertItem).toHaveBeenCalledWith('2330', '台灣積體電路製造');
      const items = useWatchlistStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].symbol).toBe('2330');
      expect(items[0].id).toBe(1);
    });

    test('hydrates a quote immediately after add even when market is closed', async () => {
      const returned = { id: 1, symbol: '2330', name: '台灣積體電路製造', sort_order: 0 };
      mockInsertItem.mockResolvedValue(returned);

      await useWatchlistStore.getState().addItem('2330', '台灣積體電路製造');

      expect(mockQuoteStore.forceRefresh).toHaveBeenCalledWith(['2330']);
      expect(mockQuoteStore.startPolling).not.toHaveBeenCalled();
    });

    test('rejects duplicate symbol (check before insert)', async () => {
      useWatchlistStore.setState({
        items: [{ id: 1, symbol: '2330', name: '台灣積體電路製造', sort_order: 0 }],
      });

      await useWatchlistStore.getState().addItem('2330', '台灣積體電路製造');

      expect(mockInsertItem).not.toHaveBeenCalled();
      expect(useWatchlistStore.getState().items).toHaveLength(1);
    });
  });

  describe('removeItem', () => {
    test('deletes from SQLite and removes from state', async () => {
      useWatchlistStore.setState({
        items: [
          { id: 1, symbol: '2330', name: '台灣積體電路製造', sort_order: 0 },
          { id: 2, symbol: '2317', name: '鴻海精密工業', sort_order: 1 },
        ],
      });

      await useWatchlistStore.getState().removeItem(1);

      expect(mockDeleteItem).toHaveBeenCalledWith(1);
      const items = useWatchlistStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].symbol).toBe('2317');
    });

    test('re-indexes sort_order after removal', async () => {
      useWatchlistStore.setState({
        items: [
          { id: 1, symbol: '2330', name: '台灣積體電路製造', sort_order: 0 },
          { id: 2, symbol: '2317', name: '鴻海精密工業', sort_order: 1 },
          { id: 3, symbol: '2454', name: '聯發科技', sort_order: 2 },
        ],
      });

      await useWatchlistStore.getState().removeItem(1);

      const items = useWatchlistStore.getState().items;
      expect(items[0].sort_order).toBe(0);
      expect(items[1].sort_order).toBe(1);
    });
  });
});

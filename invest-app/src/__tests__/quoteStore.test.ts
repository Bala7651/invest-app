import { act } from 'react';
import { useQuoteStore } from '../features/market/quoteStore';

// Mock dependencies
jest.mock('../services/stockService', () => ({
  getQuotes: jest.fn(),
}));

jest.mock('../features/market/marketHours', () => ({
  isMarketOpen: jest.fn(),
}));

import { getQuotes } from '../services/stockService';
import { isMarketOpen } from '../features/market/marketHours';

const mockGetQuotes = getQuotes as jest.MockedFunction<typeof getQuotes>;
const mockIsMarketOpen = isMarketOpen as jest.MockedFunction<typeof isMarketOpen>;

const SYMBOLS = ['2330', '2317'];

const MOCK_QUOTES = [
  {
    symbol: '2330',
    name: 'Taiwan Semiconductor',
    price: 1000,
    prevClose: 990,
    open: 992,
    high: 1005,
    low: 990,
    volume: 50000,
    updatedAt: 1700000000000,
  },
  {
    symbol: '2317',
    name: 'Hon Hai',
    price: null,
    prevClose: 200,
    open: null,
    high: null,
    low: null,
    volume: 0,
    updatedAt: 1700000000000,
  },
];

beforeEach(() => {
  jest.useFakeTimers();
  mockGetQuotes.mockResolvedValue(MOCK_QUOTES);
  mockIsMarketOpen.mockReturnValue(true);
  // Reset store state before each test
  useQuoteStore.setState({
    quotes: {},
    polling: false,
    lastError: null,
    _intervalId: null,
  });
});

afterEach(() => {
  useQuoteStore.getState().stopPolling();
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('quoteStore polling lifecycle', () => {
  test('startPolling sets polling=true', async () => {
    await act(async () => {
      useQuoteStore.getState().startPolling(SYMBOLS);
      await Promise.resolve();
    });

    expect(useQuoteStore.getState().polling).toBe(true);
  });

  test('stopPolling sets polling=false', async () => {
    await act(async () => {
      useQuoteStore.getState().startPolling(SYMBOLS);
      await Promise.resolve();
    });

    useQuoteStore.getState().stopPolling();

    expect(useQuoteStore.getState().polling).toBe(false);
    expect(useQuoteStore.getState()._intervalId).toBeNull();
  });

  test('startPolling is idempotent — calling twice does not create two intervals', async () => {
    await act(async () => {
      useQuoteStore.getState().startPolling(SYMBOLS);
      await Promise.resolve();
    });

    const firstIntervalId = useQuoteStore.getState()._intervalId;

    await act(async () => {
      useQuoteStore.getState().startPolling(SYMBOLS);
      await Promise.resolve();
    });

    const secondIntervalId = useQuoteStore.getState()._intervalId;

    // Interval should not have changed — still the same one
    expect(secondIntervalId).toBe(firstIntervalId);
    // getQuotes should only have been called once (from the first startPolling's immediate tick)
    expect(mockGetQuotes).toHaveBeenCalledTimes(1);
  });

  test('When isMarketOpen returns false, tick calls stopPolling without fetching', async () => {
    mockIsMarketOpen.mockReturnValue(false);

    useQuoteStore.getState().startPolling(SYMBOLS);
    // Tick is not called because market is closed — startPolling guards early
    await Promise.resolve();

    expect(useQuoteStore.getState().polling).toBe(false);
    expect(mockGetQuotes).not.toHaveBeenCalled();
  });

  test('When isMarketOpen returns false in tick, stopPolling is called with final fetch', async () => {
    // Simulate the scenario where the market closes mid-session:
    // startPolling guard: open
    // tick (immediate call): market closed -> final fetch + stopPolling
    mockIsMarketOpen
      .mockReturnValueOnce(true)   // startPolling guard check
      .mockReturnValueOnce(false); // tick's isMarketOpen() check -> triggers final fetch + stop

    await act(async () => {
      useQuoteStore.getState().startPolling(SYMBOLS);
      // Flush the async tick chain: tick() is called without await in startPolling,
      // so we need multiple microtask flushes
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // tick saw market closed -> called getQuotes (final fetch) -> stopPolling
    expect(mockGetQuotes).toHaveBeenCalledTimes(1);
    expect(useQuoteStore.getState().polling).toBe(false);
  });

  test('Quotes are stored in quotes record keyed by symbol', async () => {
    await act(async () => {
      useQuoteStore.getState().startPolling(SYMBOLS);
      await Promise.resolve();
    });

    const quotes = useQuoteStore.getState().quotes;
    expect(quotes['2330']).toBeDefined();
    expect(quotes['2330'].symbol).toBe('2330');
    expect(quotes['2317']).toBeDefined();
    expect(quotes['2317'].symbol).toBe('2317');
  });

  test('fetchedAt timestamp is set on each quote after successful fetch', async () => {
    const before = Date.now();

    await act(async () => {
      useQuoteStore.getState().startPolling(SYMBOLS);
      await Promise.resolve();
    });

    const after = Date.now();
    const quotes = useQuoteStore.getState().quotes;

    expect(quotes['2330'].fetchedAt).toBeGreaterThanOrEqual(before);
    expect(quotes['2330'].fetchedAt).toBeLessThanOrEqual(after);
    expect(quotes['2317'].fetchedAt).toBeGreaterThanOrEqual(before);
  });

  test('Quotes persist in store after stopPolling (cached data accessible)', async () => {
    await act(async () => {
      useQuoteStore.getState().startPolling(SYMBOLS);
      await Promise.resolve();
    });

    useQuoteStore.getState().stopPolling();

    const quotes = useQuoteStore.getState().quotes;
    expect(Object.keys(quotes)).toHaveLength(2);
    expect(quotes['2330']).toBeDefined();
    expect(quotes['2317']).toBeDefined();
  });

  test('change and changePct are computed correctly', async () => {
    await act(async () => {
      useQuoteStore.getState().startPolling(SYMBOLS);
      await Promise.resolve();
    });

    const q2330 = useQuoteStore.getState().quotes['2330'];
    // price=1000, prevClose=990 => change=10, changePct=10/990*100
    expect(q2330.change).toBe(10);
    expect(q2330.changePct).toBeCloseTo((10 / 990) * 100, 5);

    const q2317 = useQuoteStore.getState().quotes['2317'];
    // price=null => change=0, changePct=0
    expect(q2317.change).toBe(0);
    expect(q2317.changePct).toBe(0);
  });
});

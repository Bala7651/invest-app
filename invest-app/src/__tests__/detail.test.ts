import { act } from 'react';
import { useChartStore } from '../features/charts/store/chartStore';
import { Timeframe } from '../features/charts/types';

jest.mock('../features/charts/services/historicalService', () => ({
  fetchCandles: jest.fn(),
}));

jest.mock('react-native-wagmi-charts', () => ({
  CandlestickChart: {
    Provider: jest.fn(),
    Candles: jest.fn(),
    Crosshair: jest.fn(),
    Tooltip: jest.fn(),
    useCandleData: jest.fn(() => ({ open: 0, high: 0, low: 0, close: 0, timestamp: 0 })),
  },
}));

import { fetchCandles as mockFetchCandles } from '../features/charts/services/historicalService';

function resetChartStore() {
  useChartStore.setState({ cache: {}, loading: {}, errors: {} });
}

describe('detail screen logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetChartStore();
  });

  it('calls fetchCandles on mount with symbol and default timeframe 1D', async () => {
    (mockFetchCandles as jest.Mock).mockResolvedValue([]);
    const symbol = '2330';
    const defaultTimeframe: Timeframe = '1D';

    await act(async () => {
      await useChartStore.getState().fetchCandles(symbol, defaultTimeframe);
    });

    expect(mockFetchCandles).toHaveBeenCalledWith(symbol, defaultTimeframe);
  });

  it('changing timeframe triggers a new fetchCandles call', async () => {
    (mockFetchCandles as jest.Mock).mockResolvedValue([]);
    const symbol = '2330';

    await act(async () => {
      await useChartStore.getState().fetchCandles(symbol, '1D');
    });
    await act(async () => {
      await useChartStore.getState().fetchCandles(symbol, '1M');
    });

    expect(mockFetchCandles).toHaveBeenCalledTimes(2);
    expect(mockFetchCandles).toHaveBeenNthCalledWith(1, symbol, '1D');
    expect(mockFetchCandles).toHaveBeenNthCalledWith(2, symbol, '1M');
  });

  it('isLoading is true during data fetch and false after', async () => {
    let loadingDuringFetch = false;
    (mockFetchCandles as jest.Mock).mockImplementation(async () => {
      loadingDuringFetch = useChartStore.getState().loading['2330:1D'] === true;
      return [];
    });

    await act(async () => {
      await useChartStore.getState().fetchCandles('2330', '1D');
    });

    expect(loadingDuringFetch).toBe(true);
    expect(useChartStore.getState().loading['2330:1D']).toBe(false);
  });

  it('getCandles returns undefined before fetch (skeleton should show)', () => {
    const candles = useChartStore.getState().getCandles('2330', '1D');
    expect(candles).toBeUndefined();
  });
});

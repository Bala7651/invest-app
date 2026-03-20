import { act } from 'react';
import { useChartStore } from '../features/charts/store/chartStore';
import { OHLCVPoint } from '../features/charts/types';

jest.mock('../features/charts/services/historicalService', () => ({
  fetchCandles: jest.fn(),
}));

import { fetchCandles as mockFetchCandles } from '../features/charts/services/historicalService';

const mockCandles: OHLCVPoint[] = [
  { timestamp: 1000, open: 100, high: 105, low: 98, close: 103, volume: 10000 },
  { timestamp: 2000, open: 103, high: 108, low: 101, close: 106, volume: 12000 },
];

function getStore() {
  return useChartStore.getState();
}

function resetStore() {
  useChartStore.setState({ cache: {}, loading: {}, errors: {} });
}

describe('chartStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  it('fetchCandles stores data in cache under correct key', async () => {
    (mockFetchCandles as jest.Mock).mockResolvedValue(mockCandles);

    await act(async () => {
      await getStore().fetchCandles('2330', '1M');
    });

    const cache = getStore().cache;
    expect(cache['2330:1M']).toEqual(mockCandles);
  });

  it('fetchCandles skips fetch when cache key exists', async () => {
    (mockFetchCandles as jest.Mock).mockResolvedValue(mockCandles);

    await act(async () => {
      await getStore().fetchCandles('2330', '1M');
    });
    await act(async () => {
      await getStore().fetchCandles('2330', '1M');
    });

    expect(mockFetchCandles).toHaveBeenCalledTimes(1);
  });

  it('getCandles returns undefined for missing key', () => {
    const result = getStore().getCandles('9999', '1Y');
    expect(result).toBeUndefined();
  });

  it('getCandles returns cached data for existing key', async () => {
    (mockFetchCandles as jest.Mock).mockResolvedValue(mockCandles);

    await act(async () => {
      await getStore().fetchCandles('2330', '6M');
    });

    const result = getStore().getCandles('2330', '6M');
    expect(result).toEqual(mockCandles);
  });

  it('loading toggles true during fetch, false after', async () => {
    let loadingDuringFetch = false;
    (mockFetchCandles as jest.Mock).mockImplementation(async () => {
      loadingDuringFetch = getStore().loading['2330:1D'] === true;
      return mockCandles;
    });

    await act(async () => {
      await getStore().fetchCandles('2330', '1D');
    });

    expect(loadingDuringFetch).toBe(true);
    expect(getStore().loading['2330:1D']).toBe(false);
  });

  it('error state captured on fetch failure', async () => {
    (mockFetchCandles as jest.Mock).mockRejectedValue(new Error('API timeout'));

    await act(async () => {
      await getStore().fetchCandles('2330', '5D');
    });

    const errors = getStore().errors;
    expect(errors['2330:5D']).toContain('API timeout');
    expect(getStore().loading['2330:5D']).toBe(false);
  });

  it('clearCache removes specific symbol entries', async () => {
    (mockFetchCandles as jest.Mock).mockResolvedValue(mockCandles);

    await act(async () => {
      await getStore().fetchCandles('2330', '1M');
      await getStore().fetchCandles('2330', '6M');
      await getStore().fetchCandles('0050', '1Y');
    });

    act(() => {
      getStore().clearCache('2330');
    });

    const cache = getStore().cache;
    expect(cache['2330:1M']).toBeUndefined();
    expect(cache['2330:6M']).toBeUndefined();
    expect(cache['0050:1Y']).toEqual(mockCandles);
  });

  it('clearCache with no argument clears entire cache', async () => {
    (mockFetchCandles as jest.Mock).mockResolvedValue(mockCandles);

    await act(async () => {
      await getStore().fetchCandles('2330', '1M');
      await getStore().fetchCandles('0050', '1Y');
    });

    act(() => {
      getStore().clearCache();
    });

    expect(Object.keys(getStore().cache).length).toBe(0);
  });
});

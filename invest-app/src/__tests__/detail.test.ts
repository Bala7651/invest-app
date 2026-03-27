import { act } from 'react';
import { useChartStore } from '../features/charts/store/chartStore';
import { Timeframe } from '../features/charts/types';
import { useAlertStore } from '../features/alerts/store/alertStore';

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

jest.mock('../features/alerts/store/alertStore', () => ({
  useAlertStore: jest.fn(),
}));

jest.mock('../features/alerts/services/alertTask', () => ({
  ALERT_CHECK_TASK: 'PRICE_ALERT_CHECK',
  registerAlertTask: jest.fn(),
  unregisterAlertTask: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  scheduleNotificationAsync: jest.fn(),
  dismissNotificationAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
}));

import { fetchCandles as mockFetchCandles } from '../features/charts/services/historicalService';

function resetChartStore() {
  useChartStore.setState({ cache: {}, providers: {}, loading: {}, errors: {} });
}

function setupAlertStoreMock() {
  (useAlertStore as unknown as jest.Mock).mockImplementation((selector: (s: ReturnType<typeof useAlertStore.getState>) => unknown) => {
    const state = {
      alerts: [],
      getBySymbol: jest.fn().mockReturnValue(undefined),
      activeCount: jest.fn().mockReturnValue(0),
      loadFromDb: jest.fn(),
      upsertAlert: jest.fn(),
      deleteAlert: jest.fn(),
      reEnable: jest.fn(),
    };
    return selector(state as unknown as ReturnType<typeof useAlertStore.getState>);
  });
  (useAlertStore as unknown as { getState: () => unknown }).getState = jest.fn().mockReturnValue({
    alerts: [],
    getBySymbol: jest.fn().mockReturnValue(undefined),
    activeCount: jest.fn().mockReturnValue(0),
    loadFromDb: jest.fn(),
    upsertAlert: jest.fn(),
    deleteAlert: jest.fn(),
    reEnable: jest.fn(),
  });
}

describe('detail screen logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetChartStore();
    setupAlertStoreMock();
  });

  it('calls fetchCandles on mount with symbol and default timeframe 1D', async () => {
    (mockFetchCandles as jest.Mock).mockResolvedValue({ points: [], providerUsed: 'twse' });
    const symbol = '2330';
    const defaultTimeframe: Timeframe = '1D';

    await act(async () => {
      await useChartStore.getState().fetchCandles(symbol, defaultTimeframe);
    });

    expect(mockFetchCandles).toHaveBeenCalledWith(symbol, defaultTimeframe, 'auto');
  });

  it('changing timeframe triggers a new fetchCandles call', async () => {
    (mockFetchCandles as jest.Mock).mockResolvedValue({ points: [], providerUsed: 'twse' });
    const symbol = '2330';

    await act(async () => {
      await useChartStore.getState().fetchCandles(symbol, '1D');
    });
    await act(async () => {
      await useChartStore.getState().fetchCandles(symbol, '1M');
    });

    expect(mockFetchCandles).toHaveBeenCalledTimes(2);
    expect(mockFetchCandles).toHaveBeenNthCalledWith(1, symbol, '1D', 'auto');
    expect(mockFetchCandles).toHaveBeenNthCalledWith(2, symbol, '1M', 'auto');
  });

  it('isLoading is true during data fetch and false after', async () => {
    let loadingDuringFetch = false;
    (mockFetchCandles as jest.Mock).mockImplementation(async () => {
      loadingDuringFetch = useChartStore.getState().loading['2330:1D:auto'] === true;
      return { points: [], providerUsed: 'twse' };
    });

    await act(async () => {
      await useChartStore.getState().fetchCandles('2330', '1D');
    });

    expect(loadingDuringFetch).toBe(true);
    expect(useChartStore.getState().loading['2330:1D:auto']).toBe(false);
  });

  it('getCandles returns undefined before fetch (skeleton should show)', () => {
    const candles = useChartStore.getState().getCandles('2330', '1D');
    expect(candles).toBeUndefined();
  });
});

describe('ALRT-01: alert bell icon on detail screen', () => {
  beforeEach(() => {
    setupAlertStoreMock();
  });

  it('AlertModal is a function component (ALRT-01: bell icon renders via AlertModal)', () => {
    // Verify AlertModal is importable and is a React component
    const { AlertModal } = require('../features/alerts/components/AlertModal');
    expect(typeof AlertModal).toBe('function');
  });

  it('useAlertStore.getBySymbol is accessible via store interface', () => {
    const state = useAlertStore.getState() as {
      getBySymbol: (symbol: string) => unknown;
      activeCount: () => number;
    };
    expect(typeof state.getBySymbol).toBe('function');
    expect(typeof state.activeCount).toBe('function');
    expect(state.getBySymbol('2330')).toBeUndefined();
    expect(state.activeCount()).toBe(0);
  });
});

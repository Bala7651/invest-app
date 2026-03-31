import { twseDateToTimestamp, getAvailableChartProviders, getDateRange, fetchCandles } from '../features/charts/services/historicalService';
import { useSettingsStore } from '../features/settings/store/settingsStore';

// ── twseDateToTimestamp ──────────────────────────────────────────────────────

describe('twseDateToTimestamp', () => {
  it('converts 113/01/15 to 2024-01-15', () => {
    expect(twseDateToTimestamp('113/01/15')).toBe(new Date(2024, 0, 15).getTime());
  });

  it('converts 115/03/19 to 2026-03-19', () => {
    expect(twseDateToTimestamp('115/03/19')).toBe(new Date(2026, 2, 19).getTime());
  });
});

// ── getDateRange ─────────────────────────────────────────────────────────────

describe('getDateRange', () => {
  const FIXED_NOW = new Date('2026-03-20T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('1D: 1 day ago', () => {
    expect(getDateRange('1D')).toBe('2026-03-19');
  });

  it('5D: 7 calendar days ago', () => {
    expect(getDateRange('5D')).toBe('2026-03-13');
  });

  it('1M: 1 month ago', () => {
    expect(getDateRange('1M')).toBe('2026-02-20');
  });

  it('6M: 6 months ago', () => {
    expect(getDateRange('6M')).toBe('2025-09-20');
  });

  it('1Y: 1 year ago', () => {
    expect(getDateRange('1Y')).toBe('2025-03-20');
  });
});

// ── fetchCandles ─────────────────────────────────────────────────────────────

const mockFinMindResponse = {
  data: [
    { date: '2026-02-20', open: 100, max: 105, min: 98, close: 103, Trading_Volume: 10000 },
    { date: '2026-02-19', open: 99, max: 104, min: 97, close: 100, Trading_Volume: 9000 },
    { date: '2026-02-21', open: 103, max: 107, min: 102, close: 106, Trading_Volume: 11000 },
  ],
};

const mockTWSEResponse = {
  data: [
    ['115/02/19', '1,000', '99,000', '99', '104', '97', '100', '+1', '100'],
    ['115/02/20', '2,000', '103,000', '100', '105', '98', '103', '+3', '200'],
    ['115/03/15', '3,000', '310,000', '103', '108', '101', '107', '+4', '300'],
    ['115/03/19', '4,000', '420,000', '107', '110', '105', '109', '+2', '400'],
    ['115/03/20', '5,000', '545,000', '109', '112', '108', '111', '+2', '500'],
  ],
};

describe('fetchCandles', () => {
  const originalSettings = useSettingsStore.getState();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-20T12:00:00Z'));
    global.fetch = jest.fn();
    useSettingsStore.setState({ fugleEnabled: false, fugleApiKey: '' });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    useSettingsStore.setState({
      fugleEnabled: originalSettings.fugleEnabled,
      fugleApiKey: originalSettings.fugleApiKey,
    });
  });

  it('all timeframes expose the same chart provider choices', () => {
    expect(getAvailableChartProviders('1D')).toEqual(['fugle', 'twse', 'yahoo']);
    expect(getAvailableChartProviders('5D')).toEqual(['fugle', 'twse', 'yahoo']);
    expect(getAvailableChartProviders('1M')).toEqual(['fugle', 'twse', 'yahoo']);
  });

  it('1M: fetches from FinMind and returns sorted OHLCVPoint[]', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockFinMindResponse,
    });

    const resultPromise = fetchCandles('2330', '1M');
    await jest.runAllTimersAsync();
    const result = await resultPromise;
    const points = result.points;

    expect(result.providerUsed).toBe('twse');
    expect(points.length).toBe(3);
    // Check shape
    const first = points[0];
    expect(first).toHaveProperty('timestamp');
    expect(first).toHaveProperty('open');
    expect(first).toHaveProperty('high');
    expect(first).toHaveProperty('low');
    expect(first).toHaveProperty('close');
    expect(first).toHaveProperty('volume');
    // Check ascending sort
    for (let i = 1; i < points.length; i++) {
      expect(points[i].timestamp).toBeGreaterThanOrEqual(points[i - 1].timestamp);
    }
  });

  it('1M: falls back to TWSE when FinMind returns empty', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if ((url as string).includes('finmindtrade')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
      }
      return Promise.resolve({ ok: true, json: async () => mockTWSEResponse });
    });

    const resultPromise = fetchCandles('2330', '1M');
    await jest.runAllTimersAsync();
    const result = await resultPromise;

    // FinMind was called first
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('finmindtrade');
    // TWSE was also called
    const twseCalled = (global.fetch as jest.Mock).mock.calls.some((call: any[]) =>
      (call[0] as string).includes('twse.com.tw')
    );
    expect(twseCalled).toBe(true);
  }, 30000);

  it('1M: falls back to TWSE when FinMind throws', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if ((url as string).includes('finmindtrade')) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({ ok: true, json: async () => mockTWSEResponse });
    });

    const resultPromise = fetchCandles('2330', '1M');
    await jest.runAllTimersAsync();
    const result = await resultPromise;

    const twseCalled = (global.fetch as jest.Mock).mock.calls.some((call: any[]) =>
      (call[0] as string).includes('twse.com.tw')
    );
    expect(twseCalled).toBe(true);
    expect(Array.isArray(result.points)).toBe(true);
  }, 30000);

  it('TWSE response parsing: handles comma-separated numbers and ROC dates', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockTWSEResponse,
    });

    const resultPromise = fetchCandles('2330', '1D');
    await jest.runAllTimersAsync();
    const result = await resultPromise;
    const points = result.points;

    // 1D keeps the latest 2 candles so the chart still has a drawable segment.
    expect(result.providerUsed).toBe('twse');
    expect(points.length).toBe(2);
    const point = points[points.length - 1];
    expect(typeof point.open).toBe('number');
    expect(typeof point.high).toBe('number');
    expect(typeof point.low).toBe('number');
    expect(typeof point.close).toBe('number');
    expect(typeof point.volume).toBe('number');
    // Verify comma-stripped parsing: '5,000' -> 5000
    expect(point.volume).toBe(5000);
  }, 30000);

  it('5D: yahoo provider returns yahoo candles instead of TWSE fallback', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        chart: {
          result: [
            {
              timestamp: [1710720000, 1710806400, 1710892800, 1710979200, 1711065600],
              indicators: {
                quote: [
                  {
                    open: [100, 101, 102, 103, 104],
                    high: [101, 102, 103, 104, 105],
                    low: [99, 100, 101, 102, 103],
                    close: [100.5, 101.5, 102.5, 103.5, 104.5],
                    volume: [1000, 1100, 1200, 1300, 1400],
                  },
                ],
              },
            },
          ],
        },
      }),
    });

    const resultPromise = fetchCandles('2330', '5D', 'yahoo');
    await jest.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.providerUsed).toBe('yahoo');
    expect(result.points).toHaveLength(5);
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('query1.finance.yahoo.com');
  });

  it('1M: fugle provider uses historical candles endpoint', async () => {
    useSettingsStore.setState({ fugleEnabled: true, fugleApiKey: 'test-key' });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { date: '2026-02-20', open: 100, high: 105, low: 98, close: 103, volume: 10000 },
          { date: '2026-02-21', open: 103, high: 107, low: 102, close: 106, volume: 11000 },
        ],
      }),
    });

    const resultPromise = fetchCandles('2330', '1M', 'fugle');
    await jest.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.providerUsed).toBe('fugle');
    expect(result.points).toHaveLength(2);
    expect((global.fetch as jest.Mock).mock.calls[0][0].toString()).toContain('/historical/candles/2330');
    expect((global.fetch as jest.Mock).mock.calls[0][0].toString()).toContain('timeframe=D');
  });
});

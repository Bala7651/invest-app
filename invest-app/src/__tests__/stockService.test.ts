import * as StockService from '../services/stockService';
import { useSettingsStore } from '../features/settings/store/settingsStore';

const MOCK_YAHOO_CHART_RESPONSE = {
  chart: {
    result: [
      {
        meta: {
          symbol: '2330.TW',
          shortName: '台積電',
          regularMarketPrice: 1820,
          previousClose: 1810,
          regularMarketDayHigh: 1850,
          regularMarketDayLow: 1800,
          regularMarketVolume: 14571374,
          regularMarketTime: 1774319075,
        },
        indicators: {
          quote: [
            {
              open: [1850],
              high: [1850],
              low: [1800],
            },
          ],
        },
      },
    ],
  },
};

const MOCK_ALPHA_VANTAGE_GLOBAL_QUOTE_RESPONSE = {
  'Global Quote': {
    '01. symbol': '4321.TW',
    '02. open': '50.00',
    '03. high': '52.00',
    '04. low': '49.00',
    '05. price': '51.00',
    '06. volume': '32100',
    '08. previous close': '48.00',
  },
};

const MOCK_ALPHA_VANTAGE_INTRADAY_RESPONSE = {
  'Meta Data': {
    '1. Information': 'Intraday Prices and Volumes',
  },
  'Time Series (60min)': {
    '2026-03-24 10:00:00': {
      '1. open': '50.00',
      '2. high': '51.50',
      '3. low': '49.50',
      '4. close': '50.50',
      '5. volume': '1234',
    },
  },
};

const MOCK_ALPHA_VANTAGE_DAILY_RESPONSE = {
  'Time Series (Daily)': {
    '2026-03-24': {
      '1. open': '49.00',
      '2. high': '52.00',
      '3. low': '48.00',
      '4. close': '50.00',
      '5. volume': '4321',
    },
    '2026-03-23': {
      '1. open': '48.00',
      '2. high': '49.00',
      '3. low': '47.50',
      '4. close': '48.00',
      '5. volume': '2222',
    },
  },
};

beforeEach(() => {
  useSettingsStore.setState({
    marketDataProvider: 'twse_yahoo',
    alphaVantageApiKey: '',
    alphaVantageEnabled: false,
    alphaVantageDailyRemaining: 25,
    alphaVantageLastResetDate: '2099-01-01',
  });
});

// --- Export bypass tests ---

it('does not export _fetchQuotes (bypass impossible)', () => {
  expect((StockService as any)._fetchQuotes).toBeUndefined();
});

it('does not export _queue (bypass impossible)', () => {
  expect((StockService as any)._queue).toBeUndefined();
});

it('has no underscore-prefixed exports', () => {
  const underscoreExports = Object.keys(StockService).filter(k => k.startsWith('_'));
  expect(underscoreExports).toHaveLength(0);
});

it('exports getQuotes as the only fetch-triggering function', () => {
  const exports = Object.keys(StockService);
  expect(exports).toContain('getQuotes');
});

// --- parseSentinel tests ---

it('parseSentinel("-") returns null', () => {
  expect(StockService.parseSentinel('-')).toBeNull();
});

it('parseSentinel("") returns null', () => {
  expect(StockService.parseSentinel('')).toBeNull();
});

it('parseSentinel("123.45") returns 123.45', () => {
  expect(StockService.parseSentinel('123.45')).toBe(123.45);
});

it('parseSentinel("abc") returns null', () => {
  expect(StockService.parseSentinel('abc')).toBeNull();
});

// --- TWSEQuote type shape test ---

it('TWSEQuote interface has required fields via mock fetch response', async () => {
  const mockResponse = {
    msgArray: [
      {
        c: '2330',
        n: '台積電',
        z: '900.00',
        y: '895.00',
        o: '897.00',
        h: '902.00',
        l: '896.00',
        v: '12345',
        tlong: '1742299200000',
      },
    ],
  };

  global.fetch = jest.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => mockResponse,
  } as any);

  const quotes = await StockService.getQuotes(['2330']);
  expect(quotes).toHaveLength(1);
  const q = quotes[0];
  expect(q).toHaveProperty('symbol', '2330');
  expect(q).toHaveProperty('name', '台積電');
  expect(q).toHaveProperty('price', 900.0);
  expect(q).toHaveProperty('prevClose', 895.0);
  expect(q).toHaveProperty('open', 897.0);
  expect(q).toHaveProperty('high', 902.0);
  expect(q).toHaveProperty('low', 896.0);
  expect(q).toHaveProperty('volume', 12345);
  expect(q).toHaveProperty('updatedAt', 1742299200000);
});

it('getQuotes still works when AbortSignal.timeout is unavailable', async () => {
  const mockResponse = {
    msgArray: [
      {
        c: '2330',
        n: '台積電',
        z: '900.00',
        y: '895.00',
        o: '897.00',
        h: '902.00',
        l: '896.00',
        v: '12345',
        tlong: '1742299200000',
      },
    ],
  };

  const originalTimeout = (AbortSignal as any).timeout;
  (AbortSignal as any).timeout = undefined;

  global.fetch = jest.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => mockResponse,
  } as any);

  try {
    const quotes = await StockService.getQuotes(['2330']);
    expect(quotes).toHaveLength(1);
    expect(quotes[0].price).toBe(900);
  } finally {
    (AbortSignal as any).timeout = originalTimeout;
  }
});

it('getQuotes falls back to Yahoo when TWSE returns a null live price', async () => {
  const twseResponse = {
    msgArray: [
      {
        c: '2330',
        n: '台積電',
        z: '-',
        y: '1810.00',
        o: '1850.00',
        h: '1850.00',
        l: '1820.00',
        v: '12345',
        tlong: '1742299200000',
      },
    ],
  };

  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => twseResponse,
    } as any)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_YAHOO_CHART_RESPONSE,
    } as any);

  const quotes = await StockService.getQuotes(['2330']);
  expect(quotes).toHaveLength(1);
  expect(quotes[0]).toMatchObject({
    symbol: '2330',
    name: '台積電',
    price: 1820,
    prevClose: 1810,
    open: 1850,
    high: 1850,
    low: 1800,
  });
  expect(quotes[0].volume).toBe(14571374);
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect((global.fetch as jest.Mock).mock.calls[1][0]).toContain('2330.TW');
});

it('getQuotes uses Alpha Vantage fallback before Yahoo when enabled and TWSE has no live price', async () => {
  useSettingsStore.setState({
    marketDataProvider: 'alpha_vantage',
    alphaVantageApiKey: 'alpha-key',
    alphaVantageEnabled: true,
  });

  const twseResponse = {
    msgArray: [
      {
        c: '4321',
        n: '測試公司',
        z: '-',
        y: '48.00',
        o: '49.00',
        h: '51.00',
        l: '47.50',
        v: '12345',
        tlong: '1742299200000',
      },
    ],
  };

  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => twseResponse,
    } as any)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_ALPHA_VANTAGE_GLOBAL_QUOTE_RESPONSE,
    } as any);

  const quotes = await StockService.getQuotes(['4321']);
  expect(quotes).toHaveLength(1);
  expect(quotes[0]).toMatchObject({
    symbol: '4321',
    price: 51,
    prevClose: 48,
    source: 'alpha_vantage',
  });
  expect(useSettingsStore.getState().alphaVantageDailyRemaining).toBe(24);
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect((global.fetch as jest.Mock).mock.calls[1][0]).toContain('function=GLOBAL_QUOTE');
});

it('getQuotes falls back to Alpha Vantage time series when GLOBAL_QUOTE is empty', async () => {
  useSettingsStore.setState({
    marketDataProvider: 'alpha_vantage',
    alphaVantageApiKey: 'alpha-key',
    alphaVantageEnabled: true,
  });

  const twseResponse = {
    msgArray: [
      {
        c: '5432',
        n: '另一家測試公司',
        z: '-',
        y: '48.00',
        o: '49.00',
        h: '51.00',
        l: '47.50',
        v: '12345',
        tlong: '1742299200000',
      },
    ],
  };

  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => twseResponse,
    } as any)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 'Global Quote': {} }),
    } as any)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_ALPHA_VANTAGE_INTRADAY_RESPONSE,
    } as any);

  const quotes = await StockService.getQuotes(['5432']);
  expect(quotes).toHaveLength(1);
  expect(quotes[0]).toMatchObject({
    symbol: '5432',
    price: 50.5,
    source: 'alpha_vantage',
  });
  expect(global.fetch).toHaveBeenCalledTimes(3);
  expect((global.fetch as jest.Mock).mock.calls[2][0]).toContain('function=TIME_SERIES_INTRADAY');
});

it('getQuotes falls back to Alpha Vantage daily series when intraday is unavailable', async () => {
  useSettingsStore.setState({
    marketDataProvider: 'alpha_vantage',
    alphaVantageApiKey: 'alpha-key',
    alphaVantageEnabled: true,
  });

  const twseResponse = {
    msgArray: [
      {
        c: '6543',
        n: '日線測試公司',
        z: '-',
        y: '48.00',
        o: '49.00',
        h: '51.00',
        l: '47.50',
        v: '12345',
        tlong: '1742299200000',
      },
    ],
  };

  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => twseResponse,
    } as any)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 'Global Quote': {} }),
    } as any)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as any)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_ALPHA_VANTAGE_DAILY_RESPONSE,
    } as any);

  const quotes = await StockService.getQuotes(['6543']);
  expect(quotes).toHaveLength(1);
  expect(quotes[0]).toMatchObject({
    symbol: '6543',
    price: 50,
    prevClose: 48,
    source: 'alpha_vantage',
  });
  expect(global.fetch).toHaveBeenCalledTimes(4);
  expect((global.fetch as jest.Mock).mock.calls[2][0]).toContain('function=TIME_SERIES_INTRADAY');
  expect((global.fetch as jest.Mock).mock.calls[3][0]).toContain('function=TIME_SERIES_DAILY');
});

it('forceAlphaVantageLookup triggers Alpha Vantage search on manual refresh but keeps TWSE live price', async () => {
  useSettingsStore.setState({
    marketDataProvider: 'alpha_vantage',
    alphaVantageApiKey: 'alpha-key',
    alphaVantageEnabled: true,
  });

  const twseResponse = {
    msgArray: [
      {
        c: '7777',
        n: '手動刷新測試',
        z: '80.00',
        y: '79.00',
        o: '79.50',
        h: '80.50',
        l: '79.20',
        v: '9876',
        tlong: '1742299200000',
      },
    ],
  };

  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => twseResponse,
    } as any)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        'Global Quote': {
          '01. symbol': '7777.TW',
          '02. open': '78.00',
          '03. high': '78.50',
          '04. low': '77.50',
          '05. price': '78.20',
          '06. volume': '1234',
          '08. previous close': '77.80',
        },
      }),
    } as any);

  const quotes = await StockService.getQuotes(['7777'], {
    forceAlphaVantageLookup: true,
    forceAlphaVantageNetwork: true,
  });
  expect(quotes).toHaveLength(1);
  expect(quotes[0]).toMatchObject({
    symbol: '7777',
    price: 80,
    source: 'twse_live',
  });
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect((global.fetch as jest.Mock).mock.calls[1][0]).toContain('function=GLOBAL_QUOTE');
});

it('Alpha Vantage rate-limit response forces remaining quota to 0', async () => {
  useSettingsStore.setState({
    marketDataProvider: 'alpha_vantage',
    alphaVantageApiKey: 'alpha-key',
    alphaVantageEnabled: true,
    alphaVantageDailyRemaining: 11,
  });

  const twseResponse = {
    msgArray: [
      {
        c: '8888',
        n: '限額測試',
        z: '-',
        y: '10.00',
        o: '10.20',
        h: '10.30',
        l: '9.80',
        v: '1000',
        tlong: '1742299200000',
      },
    ],
  };

  global.fetch = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => twseResponse,
    } as any)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        Information:
          'Thank you for using Alpha Vantage! Please consider spreading out your free API requests more sparingly (1 request per second). You may subscribe to any of the premium plans to lift the free key rate limit.',
      }),
    } as any)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_YAHOO_CHART_RESPONSE,
    } as any);

  const quotes = await StockService.getQuotes(['8888']);
  expect(quotes).toHaveLength(1);
  expect(useSettingsStore.getState().alphaVantageDailyRemaining).toBe(0);
});

// --- URL format test ---

it('getQuotes formats symbols as pipe-delimited tse_XXXX.tw string in URL', async () => {
  const mockResponse = {
    msgArray: [
      { c: '2330', n: '台積電', z: '900', y: '895', o: '897', h: '902', l: '896', v: '12345', tlong: '1742299200000' },
      { c: '2317', n: '鴻海', z: '200', y: '198', o: '199', h: '201', l: '197', v: '67890', tlong: '1742299200000' },
    ],
  };

  global.fetch = jest.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => mockResponse,
  } as any);

  await StockService.getQuotes(['2330', '2317']);

  expect(global.fetch).toHaveBeenCalledTimes(1);
  const calledUrl = decodeURIComponent((global.fetch as jest.Mock).mock.calls[0][0] as string);
  expect(calledUrl).toContain('tse_2330.tw');
  expect(calledUrl).toContain('tse_2317.tw');
  expect(calledUrl).toContain('|');
});

// --- Queue spacing test ---

it('two sequential getQuotes calls are spaced at least 2000ms apart', async () => {
  const timestamps: number[] = [];

  global.fetch = jest.fn().mockImplementation(async (url: string) => {
    timestamps.push(Date.now());
    const symbol = url.includes('2317') ? '2317' : '2330';
    return {
      ok: true,
      json: async () => ({
        msgArray: [
          {
            c: symbol,
            n: symbol === '2330' ? '台積電' : '鴻海',
            z: symbol === '2330' ? '900' : '200',
            y: symbol === '2330' ? '895' : '198',
            o: symbol === '2330' ? '897' : '199',
            h: symbol === '2330' ? '902' : '201',
            l: symbol === '2330' ? '896' : '197',
            v: symbol === '2330' ? '12345' : '67890',
            tlong: '1742299200000',
          },
        ],
      }),
    };
  });

  // Run two calls sequentially
  await StockService.getQuotes(['2330']);
  await StockService.getQuotes(['2317']);

  expect(timestamps).toHaveLength(2);
  const gap = timestamps[1] - timestamps[0];
  expect(gap).toBeGreaterThanOrEqual(2000);
}, 10000);

import * as StockService from '../services/stockService';

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

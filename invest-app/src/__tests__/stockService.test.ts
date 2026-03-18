import * as StockService from '../services/stockService';

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

// --- URL format test ---

it('getQuotes formats symbols as pipe-delimited tse_XXXX.tw string in URL', async () => {
  const mockResponse = { msgArray: [] };

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
  let callCount = 0;
  const mockResponse = { msgArray: [] };

  global.fetch = jest.fn().mockImplementation(async () => {
    timestamps.push(Date.now());
    return {
      ok: true,
      json: async () => mockResponse,
    };
  });

  // Run two calls sequentially
  await StockService.getQuotes(['2330']);
  await StockService.getQuotes(['2317']);

  expect(timestamps).toHaveLength(2);
  const gap = timestamps[1] - timestamps[0];
  expect(gap).toBeGreaterThanOrEqual(2000);
}, 10000);

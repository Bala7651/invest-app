import {
  getTodayISO,
  getCutoffISO,
  isCatchUpNeeded,
  fetchTWIX,
  buildSummaryPrompt,
  buildIndexSummaryPrompt,
  upsertSummary,
  purgeOldSummaries,
} from '../features/summary/services/summaryService';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../db/client', () => ({
  db: {
    delete: jest.fn(),
    insert: jest.fn(),
    select: jest.fn(),
  },
}));

jest.mock('../db/schema', () => ({
  daily_summaries: { symbol: 'symbol', date: 'date', id: 'id' },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((col, val) => ({ col, val, op: 'eq' })),
  lt: jest.fn((col, val) => ({ col, val, op: 'lt' })),
  and: jest.fn((...args) => ({ args, op: 'and' })),
  desc: jest.fn((col) => ({ col, op: 'desc' })),
}));

jest.mock('../features/market/marketHours', () => ({
  isHoliday: jest.fn(() => false),
}));

import { db } from '../db/client';
import { isHoliday } from '../features/market/marketHours';

const mockDb = db as jest.Mocked<typeof db>;
const mockIsHoliday = isHoliday as jest.MockedFunction<typeof isHoliday>;

// ---------------------------------------------------------------------------
// Helpers for building mock drizzle chain
// ---------------------------------------------------------------------------

function makeChain(finalValue: unknown) {
  const chain: Record<string, jest.Mock> = {};
  const chainProxy = new Proxy(chain, {
    get(_target, prop: string) {
      if (!(prop in chain)) {
        chain[prop] = jest.fn(() => chainProxy);
      }
      return chain[prop];
    },
  });
  // Override the last method in common query chains
  chain['where'] = jest.fn(() => finalValue instanceof Promise ? finalValue : Promise.resolve(finalValue));
  return chainProxy;
}

// ---------------------------------------------------------------------------
// getTodayISO
// ---------------------------------------------------------------------------

describe('getTodayISO', () => {
  it('returns a string in YYYY-MM-DD format', () => {
    const result = getTodayISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns a date string with length 10', () => {
    expect(getTodayISO()).toHaveLength(10);
  });
});

// ---------------------------------------------------------------------------
// getCutoffISO
// ---------------------------------------------------------------------------

describe('getCutoffISO', () => {
  it('returns a date string in YYYY-MM-DD format', () => {
    expect(getCutoffISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns a date that is less than today', () => {
    expect(getCutoffISO() < getTodayISO()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isCatchUpNeeded
// ---------------------------------------------------------------------------

describe('isCatchUpNeeded', () => {
  const RealDate = global.Date;

  afterEach(() => {
    global.Date = RealDate;
    mockIsHoliday.mockReturnValue(false);
  });

  function mockTaipeiTime(isoUtcString: string) {
    // We need toLocaleString to return a specific Taipei time.
    // Easiest: mock Date constructor to return a fixed date.
    // The function uses: new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' })
    // We mock Date() to return a fixed UTC time that maps to desired Taipei time.
    const fixedDate = new RealDate(isoUtcString);
    const MockDate = jest.fn(() => fixedDate) as unknown as typeof Date;
    MockDate.now = RealDate.now;
    MockDate.parse = RealDate.parse;
    MockDate.UTC = RealDate.UTC;
    Object.setPrototypeOf(MockDate, RealDate);
    global.Date = MockDate;
  }

  it('returns false on Saturday (Taipei time)', () => {
    // 2026-03-21 is Saturday in Taipei
    mockTaipeiTime('2026-03-21T05:00:00.000Z'); // 13:00 Taipei Saturday
    expect(isCatchUpNeeded()).toBe(false);
  });

  it('returns false on Sunday (Taipei time)', () => {
    // 2026-03-22 is Sunday in Taipei
    mockTaipeiTime('2026-03-22T05:00:00.000Z'); // 13:00 Taipei Sunday
    expect(isCatchUpNeeded()).toBe(false);
  });

  it('returns false before 12:30 on a weekday', () => {
    // 2026-03-23 is Monday
    mockTaipeiTime('2026-03-23T02:00:00.000Z'); // 10:00 Taipei Monday
    expect(isCatchUpNeeded()).toBe(false);
  });

  it('returns true after 12:30 on a weekday', () => {
    // 2026-03-23 is Monday, 13:00 Taipei = 05:00 UTC
    mockTaipeiTime('2026-03-23T05:00:00.000Z'); // 13:00 Taipei Monday
    expect(isCatchUpNeeded()).toBe(true);
  });

  it('returns false on a holiday (weekday)', () => {
    // 2026-03-23 is Monday but mark as holiday
    mockTaipeiTime('2026-03-23T05:00:00.000Z'); // 13:00 Taipei Monday
    mockIsHoliday.mockReturnValue(true);
    expect(isCatchUpNeeded()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// fetchTWIX
// ---------------------------------------------------------------------------

describe('fetchTWIX', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const mockMIIndexResponse = [
    {
      '指數': '發行量加權股價指數',
      '收盤指數': '33543.88',
      '漲跌': '+',
      '漲跌點數': '145.80',
      '漲跌百分比': '0.44',
    },
    {
      '指數': '其他指數',
      '收盤指數': '1000.00',
      '漲跌': '-',
      '漲跌點數': '5.00',
      '漲跌百分比': '0.50',
    },
  ];

  it('returns parsed index data on successful response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMIIndexResponse,
    });

    const result = await fetchTWIX();
    expect(result).not.toBeNull();
    expect(result!.close).toBeCloseTo(33543.88);
    expect(result!.change).toBeCloseTo(145.80);
    expect(result!.changePct).toBeCloseTo(0.44);
  });

  it('applies negative sign when 漲跌 is "-"', async () => {
    const negativeResponse = [
      {
        '指數': '發行量加權股價指數',
        '收盤指數': '33000.00',
        '漲跌': '-',
        '漲跌點數': '200.00',
        '漲跌百分比': '0.60',
      },
    ];
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => negativeResponse,
    });

    const result = await fetchTWIX();
    expect(result!.change).toBeCloseTo(-200.00);
    expect(result!.changePct).toBeCloseTo(-0.60);
  });

  it('returns null on non-ok HTTP response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });
    expect(await fetchTWIX()).toBeNull();
  });

  it('returns null on network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failed'));
    expect(await fetchTWIX()).toBeNull();
  });

  it('returns null when TAIEX entry not found in response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ '指數': '其他指數', '收盤指數': '1000.00', '漲跌': '+', '漲跌點數': '5.00', '漲跌百分比': '0.50' }],
    });
    expect(await fetchTWIX()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildSummaryPrompt
// ---------------------------------------------------------------------------

describe('buildSummaryPrompt', () => {
  const quote = {
    price: 850.5,
    open: 845.0,
    high: 852.0,
    low: 842.0,
    volume: 12345,
    change: 12.5,
    changePct: 1.49,
    prevClose: 838.0,
    ma5: 840.2,
    ma20: 832.6,
    avgVolume20: 11000,
    volumeRatio: 1.1,
  };

  it('contains the symbol', () => {
    expect(buildSummaryPrompt('2330', '台積電', quote)).toContain('2330');
  });

  it('contains the stock name', () => {
    expect(buildSummaryPrompt('2330', '台積電', quote)).toContain('台積電');
  });

  it('embeds actual price value', () => {
    expect(buildSummaryPrompt('2330', '台積電', quote)).toContain('850.5');
  });

  it('embeds actual change value', () => {
    expect(buildSummaryPrompt('2330', '台積電', quote)).toContain('12.50');
  });

  it('embeds actual prevClose value', () => {
    expect(buildSummaryPrompt('2330', '台積電', quote)).toContain('838');
  });

  it('handles null price gracefully', () => {
    const quoteWithNull = { ...quote, price: null };
    expect(buildSummaryPrompt('2330', '台積電', quoteWithNull)).toContain('無資料');
  });
});

// ---------------------------------------------------------------------------
// buildIndexSummaryPrompt
// ---------------------------------------------------------------------------

describe('buildIndexSummaryPrompt', () => {
  const indexData = { close: 33543.88, change: 145.80, changePct: 0.44 };

  it('contains the index close value', () => {
    expect(buildIndexSummaryPrompt(indexData)).toContain('33543.88');
  });

  it('contains the change value', () => {
    expect(buildIndexSummaryPrompt(indexData)).toContain('145.80');
  });

  it('contains the changePct value', () => {
    expect(buildIndexSummaryPrompt(indexData)).toContain('0.44');
  });

  it('uses "+" sign for positive change', () => {
    expect(buildIndexSummaryPrompt(indexData)).toContain('+');
  });

  it('shows negative sign for negative change', () => {
    const negData = { close: 33000.00, change: -200.00, changePct: -0.60 };
    const prompt = buildIndexSummaryPrompt(negData);
    expect(prompt).toContain('-200.00');
    expect(prompt).toContain('-0.60');
  });
});

// ---------------------------------------------------------------------------
// upsertSummary
// ---------------------------------------------------------------------------

describe('upsertSummary', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('calls db.delete before db.insert', async () => {
    const deleteChain = { where: jest.fn().mockResolvedValue(undefined) };
    const insertChain = { values: jest.fn().mockResolvedValue(undefined) };
    (mockDb.delete as jest.Mock).mockReturnValue(deleteChain);
    (mockDb.insert as jest.Mock).mockReturnValue(insertChain);

    await upsertSummary('2330', '2026-03-21', 'test content');

    expect(mockDb.delete).toHaveBeenCalledTimes(1);
    expect(deleteChain.where).toHaveBeenCalledTimes(1);
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
    expect(insertChain.values).toHaveBeenCalledWith({
      symbol: '2330',
      date: '2026-03-21',
      content: 'test content',
    });
  });
});

// ---------------------------------------------------------------------------
// purgeOldSummaries
// ---------------------------------------------------------------------------

describe('purgeOldSummaries', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('calls db.delete with lt operator for cutoff date', async () => {
    const deleteChain = { where: jest.fn().mockResolvedValue(undefined) };
    (mockDb.delete as jest.Mock).mockReturnValue(deleteChain);

    await purgeOldSummaries();

    expect(mockDb.delete).toHaveBeenCalledTimes(1);
    expect(deleteChain.where).toHaveBeenCalledTimes(1);

    const ltMock = require('drizzle-orm').lt as jest.Mock;
    expect(ltMock).toHaveBeenCalled();
    const [, cutoffArg] = ltMock.mock.calls[ltMock.mock.calls.length - 1];
    expect(cutoffArg).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

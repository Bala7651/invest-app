import {
  upsertAlert,
  getAll,
  deleteAlert,
  markTriggered,
  reEnableDirection,
  getActiveSymbols,
} from '../features/alerts/services/alertService';

jest.mock('../db/client', () => ({
  db: {
    delete: jest.fn(),
    insert: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../db/schema', () => ({
  price_alerts: {
    id: 'id',
    symbol: 'symbol',
    name: 'name',
    upper_price: 'upper_price',
    lower_price: 'lower_price',
    upper_status: 'upper_status',
    lower_status: 'lower_status',
  },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((col, val) => ({ col, val, op: 'eq' })),
  or: jest.fn((...args) => ({ args, op: 'or' })),
}));

import { db } from '../db/client';

const mockDb = db as jest.Mocked<typeof db>;

function makeDeleteChain() {
  const chain = { where: jest.fn().mockResolvedValue(undefined) };
  return chain;
}

function makeInsertChain() {
  const chain = { values: jest.fn().mockResolvedValue(undefined) };
  return chain;
}

function makeUpdateChain() {
  const setChain = { where: jest.fn().mockResolvedValue(undefined) };
  return { set: jest.fn(() => setChain) };
}

function makeSelectChain(rows: unknown[]) {
  const fromChain = {
    where: jest.fn().mockResolvedValue(rows),
  };
  return { from: jest.fn(() => fromChain) };
}

function makeSelectFromChain(rows: unknown[]) {
  return { from: jest.fn(() => Promise.resolve(rows)) };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('upsertAlert', () => {
  it('calls delete then insert for the given symbol', async () => {
    const deleteChain = makeDeleteChain();
    const insertChain = makeInsertChain();
    (mockDb.delete as jest.Mock).mockReturnValue(deleteChain);
    (mockDb.insert as jest.Mock).mockReturnValue(insertChain);

    await upsertAlert('2330', '台積電', 1000, 900);

    expect(mockDb.delete).toHaveBeenCalledTimes(1);
    expect(deleteChain.where).toHaveBeenCalledTimes(1);
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
    expect(insertChain.values).toHaveBeenCalledWith({
      symbol: '2330',
      name: '台積電',
      upper_price: 1000,
      lower_price: 900,
      upper_status: 'active',
      lower_status: 'active',
    });
  });

  it('resets both statuses to active on upsert', async () => {
    const deleteChain = makeDeleteChain();
    const insertChain = makeInsertChain();
    (mockDb.delete as jest.Mock).mockReturnValue(deleteChain);
    (mockDb.insert as jest.Mock).mockReturnValue(insertChain);

    await upsertAlert('2330', '台積電', null, 900);

    const callArgs = insertChain.values.mock.calls[0][0];
    expect(callArgs.upper_status).toBe('active');
    expect(callArgs.lower_status).toBe('active');
  });

  it('allows null upper_price and lower_price', async () => {
    const deleteChain = makeDeleteChain();
    const insertChain = makeInsertChain();
    (mockDb.delete as jest.Mock).mockReturnValue(deleteChain);
    (mockDb.insert as jest.Mock).mockReturnValue(insertChain);

    await upsertAlert('2330', '台積電', null, null);

    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ upper_price: null, lower_price: null })
    );
  });
});

describe('getAll', () => {
  it('returns all rows from price_alerts table', async () => {
    const rows = [
      { id: 1, symbol: '2330', name: '台積電', upper_price: 1000, lower_price: 900, upper_status: 'active', lower_status: 'active' },
    ];
    (mockDb.select as jest.Mock).mockReturnValue(makeSelectFromChain(rows));

    const result = await getAll();

    expect(mockDb.select).toHaveBeenCalledTimes(1);
    expect(result).toEqual(rows);
  });

  it('returns empty array when no alerts exist', async () => {
    (mockDb.select as jest.Mock).mockReturnValue(makeSelectFromChain([]));

    const result = await getAll();

    expect(result).toEqual([]);
  });
});

describe('deleteAlert', () => {
  it('calls delete with the correct id', async () => {
    const deleteChain = makeDeleteChain();
    (mockDb.delete as jest.Mock).mockReturnValue(deleteChain);

    await deleteAlert(42);

    expect(mockDb.delete).toHaveBeenCalledTimes(1);
    expect(deleteChain.where).toHaveBeenCalledTimes(1);
    const eqMock = require('drizzle-orm').eq as jest.Mock;
    const eqCalls = eqMock.mock.calls;
    const idCall = eqCalls.find((c: unknown[]) => c[1] === 42);
    expect(idCall).toBeDefined();
  });
});

describe('markTriggered', () => {
  it('updates upper_status to triggered for upper direction', async () => {
    const updateChain = makeUpdateChain();
    (mockDb.update as jest.Mock).mockReturnValue(updateChain);

    await markTriggered('2330', 'upper');

    expect(mockDb.update).toHaveBeenCalledTimes(1);
    expect(updateChain.set).toHaveBeenCalledWith({ upper_status: 'triggered' });
    expect(updateChain.set().where).toHaveBeenCalledTimes(1);
  });

  it('updates lower_status to triggered for lower direction', async () => {
    const updateChain = makeUpdateChain();
    (mockDb.update as jest.Mock).mockReturnValue(updateChain);

    await markTriggered('2330', 'lower');

    expect(updateChain.set).toHaveBeenCalledWith({ lower_status: 'triggered' });
  });
});

describe('reEnableDirection', () => {
  it('updates upper_status to active for upper direction', async () => {
    const updateChain = makeUpdateChain();
    (mockDb.update as jest.Mock).mockReturnValue(updateChain);

    await reEnableDirection('2330', 'upper');

    expect(updateChain.set).toHaveBeenCalledWith({ upper_status: 'active' });
  });

  it('updates lower_status to active for lower direction', async () => {
    const updateChain = makeUpdateChain();
    (mockDb.update as jest.Mock).mockReturnValue(updateChain);

    await reEnableDirection('2330', 'lower');

    expect(updateChain.set).toHaveBeenCalledWith({ lower_status: 'active' });
  });
});

describe('getActiveSymbols', () => {
  it('returns unique symbols with at least one active direction', async () => {
    const rows = [{ symbol: '2330' }, { symbol: '2317' }];
    (mockDb.select as jest.Mock).mockReturnValue(makeSelectChain(rows));

    const result = await getActiveSymbols();

    expect(result).toEqual(['2330', '2317']);
  });

  it('deduplicates symbols', async () => {
    const rows = [{ symbol: '2330' }, { symbol: '2330' }];
    (mockDb.select as jest.Mock).mockReturnValue(makeSelectChain(rows));

    const result = await getActiveSymbols();

    expect(result).toEqual(['2330']);
  });

  it('returns empty array when no active alerts', async () => {
    (mockDb.select as jest.Mock).mockReturnValue(makeSelectChain([]));

    const result = await getActiveSymbols();

    expect(result).toEqual([]);
  });
});

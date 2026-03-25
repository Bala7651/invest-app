import {
  upsertHolding,
  getAllHoldings,
  deleteHolding,
} from '../features/portfolio/services/holdingsService';

jest.mock('../db/client', () => ({
  db: {
    delete: jest.fn(),
    insert: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../db/schema', () => ({
  holdings: {
    id: 'id',
    symbol: 'symbol',
    name: 'name',
    quantity: 'quantity',
    entry_price: 'entry_price',
  },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((col, val) => ({ col, val, op: 'eq' })),
}));

import { db } from '../db/client';

const mockDb = db as jest.Mocked<typeof db>;

function makeDeleteChain() {
  const chain = { where: jest.fn().mockResolvedValue(undefined) };
  return chain;
}

function makeInsertChain() {
  const conflictChain = { onConflictDoUpdate: jest.fn().mockResolvedValue(undefined) };
  const chain = { values: jest.fn(() => conflictChain) };
  return chain;
}

function makeSelectFromChain(rows: unknown[]) {
  return { from: jest.fn(() => Promise.resolve(rows)) };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('upsertHolding', () => {
  it('inserts or updates holdings rows via conflict handling', async () => {
    const insertChain = makeInsertChain();
    (mockDb.insert as jest.Mock).mockReturnValue(insertChain);

    await upsertHolding('2330', '台積電', 5000);

    expect(mockDb.insert).toHaveBeenCalledTimes(1);
    expect(insertChain.values).toHaveBeenCalledWith({
      symbol: '2330',
      name: '台積電',
      quantity: 5000,
      entry_price: null,
    });
    const conflictChain = insertChain.values.mock.results[0].value;
    expect(conflictChain.onConflictDoUpdate).toHaveBeenCalledWith({
      target: 'symbol',
      set: expect.objectContaining({
        name: '台積電',
        quantity: 5000,
        entry_price: null,
      }),
    });
  });
});

describe('getAllHoldings', () => {
  it('returns all rows from holdings table', async () => {
    const rows = [
      { id: 1, symbol: '2330', name: '台積電', quantity: 5000 },
      { id: 2, symbol: '2317', name: '鴻海', quantity: 2000 },
    ];
    (mockDb.select as jest.Mock).mockReturnValue(makeSelectFromChain(rows));

    const result = await getAllHoldings();

    expect(mockDb.select).toHaveBeenCalledTimes(1);
    expect(result).toEqual(rows);
  });

  it('returns empty array when no holdings exist', async () => {
    (mockDb.select as jest.Mock).mockReturnValue(makeSelectFromChain([]));

    const result = await getAllHoldings();

    expect(result).toEqual([]);
  });
});

describe('deleteHolding', () => {
  it('removes row by symbol', async () => {
    const deleteChain = makeDeleteChain();
    (mockDb.delete as jest.Mock).mockReturnValue(deleteChain);

    await deleteHolding('2330');

    expect(mockDb.delete).toHaveBeenCalledTimes(1);
    expect(deleteChain.where).toHaveBeenCalledTimes(1);
    const eqMock = require('drizzle-orm').eq as jest.Mock;
    const eqCalls = eqMock.mock.calls;
    const symbolCall = eqCalls.find((c: unknown[]) => c[1] === '2330');
    expect(symbolCall).toBeDefined();
  });
});

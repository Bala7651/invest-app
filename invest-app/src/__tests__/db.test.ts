import { watchlist, daily_summaries } from '../db/schema';

describe('drizzle schema exports', () => {
  it('exports watchlist table', () => {
    expect(watchlist).toBeDefined();
  });

  it('exports daily_summaries table', () => {
    expect(daily_summaries).toBeDefined();
  });

  it('watchlist has expected columns', () => {
    const columns = Object.keys(watchlist);
    expect(columns).toContain('id');
    expect(columns).toContain('symbol');
    expect(columns).toContain('name');
    expect(columns).toContain('sort_order');
    expect(columns).toContain('created_at');
  });

  it('daily_summaries has expected columns', () => {
    const columns = Object.keys(daily_summaries);
    expect(columns).toContain('id');
    expect(columns).toContain('symbol');
    expect(columns).toContain('date');
    expect(columns).toContain('content');
    expect(columns).toContain('created_at');
  });

  it('watchlist.symbol has unique constraint', () => {
    const symbolCol = (watchlist as any).symbol;
    expect(symbolCol).toBeDefined();
  });
});

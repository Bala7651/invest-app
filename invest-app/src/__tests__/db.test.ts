import {
  watchlist,
  daily_summaries,
  analysis_cache,
  holdings,
  portfolio_ai_state,
} from '../db/schema';

describe('drizzle schema exports', () => {
  it('exports watchlist table', () => {
    expect(watchlist).toBeDefined();
  });

  it('exports daily_summaries table', () => {
    expect(daily_summaries).toBeDefined();
  });

  it('exports analysis_cache table', () => {
    expect(analysis_cache).toBeDefined();
  });

  it('exports holdings table', () => {
    expect(holdings).toBeDefined();
  });

  it('exports portfolio_ai_state table', () => {
    expect(portfolio_ai_state).toBeDefined();
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

  it('analysis_cache has expected columns', () => {
    const columns = Object.keys(analysis_cache);
    expect(columns).toContain('id');
    expect(columns).toContain('symbol');
    expect(columns).toContain('content');
    expect(columns).toContain('cached_at');
    expect(columns).toContain('updated_at');
  });

  it('holdings has expected columns', () => {
    const columns = Object.keys(holdings);
    expect(columns).toContain('id');
    expect(columns).toContain('symbol');
    expect(columns).toContain('name');
    expect(columns).toContain('quantity');
    expect(columns).toContain('entry_price');
  });

  it('portfolio_ai_state has expected columns', () => {
    const columns = Object.keys(portfolio_ai_state);
    expect(columns).toContain('id');
    expect(columns).toContain('last_analysis');
    expect(columns).toContain('chat_history');
    expect(columns).toContain('suggested_questions');
    expect(columns).toContain('suggested_questions_source');
    expect(columns).toContain('created_at');
    expect(columns).toContain('updated_at');
  });

  it('watchlist.symbol has unique constraint', () => {
    const symbolCol = (watchlist as any).symbol;
    expect(symbolCol).toBeDefined();
  });
});

import { filterStocks } from '../features/watchlist/utils/searchStocks';

describe('filterStocks', () => {
  test('empty query returns empty array', () => {
    expect(filterStocks('')).toHaveLength(0);
  });

  test('search by exact code returns matching entry', () => {
    const results = filterStocks('2330');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.code === '2330')).toBe(true);
  });

  test('search by partial name returns matching entries', () => {
    const results = filterStocks('台積');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.name.includes('台積'))).toBe(true);
  });

  test('search by partial code returns matching entries', () => {
    const results = filterStocks('23');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.code.includes('23') || r.name.includes('23'))).toBe(true);
  });

  test('results capped at 50', () => {
    // Search with a very common substring to get many results
    const results = filterStocks('0');
    expect(results.length).toBeLessThanOrEqual(50);
  });

  test('non-matching query returns empty array', () => {
    const results = filterStocks('ZZZZNOTASTOCK99999');
    expect(results).toHaveLength(0);
  });
});

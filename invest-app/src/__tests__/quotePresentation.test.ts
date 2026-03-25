import {
  buildQuoteSnapshot,
  formatQuoteSourceMeta,
  getQuoteSourceDetail,
  getQuoteSourceLabel,
} from '../features/market/quotePresentation';

describe('quotePresentation', () => {
  it('maps TWSE live quotes to 即時', () => {
    expect(getQuoteSourceLabel('twse_live')).toBe('即時');
    expect(getQuoteSourceDetail('twse_live')).toBe('TWSE');
  });

  it('maps Fugle live quotes to 即時', () => {
    expect(getQuoteSourceLabel('fugle_live')).toBe('即時');
    expect(getQuoteSourceDetail('fugle_live')).toBe('Fugle');
  });

  it('maps delayed providers to 延遲', () => {
    expect(getQuoteSourceLabel('alpha_vantage')).toBe('延遲');
    expect(getQuoteSourceLabel('yahoo_delayed')).toBe('延遲');
  });

  it('maps close fallbacks to 收盤', () => {
    expect(getQuoteSourceLabel('twse_close')).toBe('收盤');
    expect(getQuoteSourceLabel('prev_close')).toBe('收盤');
  });

  it('formats source meta with bid and ask for live book quotes', () => {
    expect(formatQuoteSourceMeta('twse_live', 1820, 1825)).toBe('即時 · TWSE · 買 1820.00 / 賣 1825.00');
  });

  it('builds a full snapshot for delayed quotes', () => {
    const snapshot = buildQuoteSnapshot('台積電', {
      symbol: '2330',
      name: '台積電',
      price: 1815,
      prevClose: 1810,
      change: 5,
      changePct: 0.28,
      fetchedAt: 123,
      volume: 1000,
      open: 1810,
      high: 1820,
      low: 1805,
      bid: null,
      ask: null,
      source: 'alpha_vantage',
    });

    expect(snapshot.sourceLabel).toBe('延遲');
    expect(snapshot.sourceMeta).toBe('延遲 · Alpha Vantage');
    expect(snapshot.price).toBe(1815);
  });
});

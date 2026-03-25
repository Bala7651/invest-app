export type QuoteSource = 'twse_live' | 'fugle_live' | 'alpha_vantage' | 'yahoo_delayed' | 'twse_close' | 'prev_close';
export type QuoteSourceLabel = '即時' | '延遲' | '收盤';

export interface QuotePresentationInput {
  symbol: string;
  name: string;
  price: number | null;
  prevClose: number;
  change: number;
  changePct: number;
  fetchedAt: number;
  volume: number;
  open: number | null;
  high: number | null;
  low: number | null;
  bid: number | null;
  ask: number | null;
  source: QuoteSource;
}

export interface QuoteSnapshot {
  symbol: string;
  name: string;
  price: number | null;
  prevClose: number;
  change: number;
  changePct: number;
  fetchedAt: number | null;
  volume: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  bid: number | null;
  ask: number | null;
  source: QuoteSource | null;
  sourceLabel: QuoteSourceLabel | null;
  sourceDetail: string | null;
  sourceMeta: string | null;
}

export function getQuoteSourceLabel(source: QuoteSource): QuoteSourceLabel {
  if (source === 'twse_live' || source === 'fugle_live') return '即時';
  if (source === 'alpha_vantage' || source === 'yahoo_delayed') return '延遲';
  return '收盤';
}

export function getQuoteSourceDetail(source: QuoteSource): string {
  if (source === 'twse_live') return 'TWSE';
  if (source === 'fugle_live') return 'Fugle';
  if (source === 'alpha_vantage') return 'Alpha Vantage';
  if (source === 'yahoo_delayed') return 'Yahoo';
  return 'TWSE';
}

export function formatQuoteSourceMeta(
  source: QuoteSource,
  bid: number | null = null,
  ask: number | null = null,
): string {
  const parts = [getQuoteSourceLabel(source), getQuoteSourceDetail(source)];
  if (bid != null && ask != null) {
    parts.push(`買 ${bid.toFixed(2)} / 賣 ${ask.toFixed(2)}`);
  }
  return parts.join(' · ');
}

export function buildQuoteSnapshot(
  name: string,
  quote?: Partial<QuotePresentationInput> | null,
): QuoteSnapshot {
  if (!quote) {
    return {
      symbol: '',
      name,
      price: null,
      prevClose: 0,
      change: 0,
      changePct: 0,
      fetchedAt: null,
      volume: null,
      open: null,
      high: null,
      low: null,
      bid: null,
      ask: null,
      source: null,
      sourceLabel: null,
      sourceDetail: null,
      sourceMeta: null,
    };
  }

  const source = quote.source ?? null;
  return {
    symbol: quote.symbol ?? '',
    name: quote.name ?? name,
    price: quote.price ?? null,
    prevClose: quote.prevClose ?? 0,
    change: quote.change ?? 0,
    changePct: quote.changePct ?? 0,
    fetchedAt: quote.fetchedAt ?? null,
    volume: quote.volume ?? null,
    open: quote.open ?? null,
    high: quote.high ?? null,
    low: quote.low ?? null,
    bid: quote.bid ?? null,
    ask: quote.ask ?? null,
    source,
    sourceLabel: source ? getQuoteSourceLabel(source) : null,
    sourceDetail: source ? getQuoteSourceDetail(source) : null,
    sourceMeta: source ? formatQuoteSourceMeta(source, quote.bid ?? null, quote.ask ?? null) : null,
  };
}

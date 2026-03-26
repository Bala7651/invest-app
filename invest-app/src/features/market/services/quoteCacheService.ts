import { eq, inArray } from 'drizzle-orm';
import { db } from '../../../db/client';
import { quote_cache } from '../../../db/schema';
import { QuoteFreshnessState, QuoteSource } from '../quotePresentation';

interface QuoteCacheRow {
  symbol: string;
  name: string;
  price: number | null;
  prev_close: number;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number;
  change: number;
  change_pct: number;
  fetched_at: Date | null;
  bid: number | null;
  ask: number | null;
  source: string;
  source_updated_at: Date | null;
  freshness_state: string;
}

export interface PersistedQuoteEntry {
  symbol: string;
  name: string;
  price: number | null;
  prevClose: number;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number;
  change: number;
  changePct: number;
  fetchedAt: number;
  bid: number | null;
  ask: number | null;
  source: QuoteSource;
  sourceUpdatedAt: number | null;
  freshnessState: QuoteFreshnessState;
}

const VALID_SOURCES = new Set<QuoteSource>([
  'fugle_live',
  'twse_live',
  'alpha_vantage',
  'yahoo_delayed',
  'twse_close',
  'prev_close',
]);

const VALID_FRESHNESS_STATES = new Set<QuoteFreshnessState>(['fresh', 'stale']);

function normalizeSource(value: string): QuoteSource {
  return VALID_SOURCES.has(value as QuoteSource) ? (value as QuoteSource) : 'prev_close';
}

function normalizeFreshnessState(value: string): QuoteFreshnessState {
  return VALID_FRESHNESS_STATES.has(value as QuoteFreshnessState)
    ? (value as QuoteFreshnessState)
    : 'fresh';
}

export async function loadPersistedQuotes(symbols: string[]): Promise<PersistedQuoteEntry[]> {
  if (symbols.length === 0) return [];

  const rows = (await db
    .select()
    .from(quote_cache)
    .where(inArray(quote_cache.symbol, symbols))) as QuoteCacheRow[];

  return rows.map((row) => ({
    symbol: row.symbol,
    name: row.name,
    price: row.price,
    prevClose: row.prev_close,
    open: row.open,
    high: row.high,
    low: row.low,
    volume: row.volume ?? 0,
    change: row.change ?? 0,
    changePct: row.change_pct ?? 0,
    fetchedAt: row.fetched_at?.getTime() ?? 0,
    bid: row.bid,
    ask: row.ask,
    source: normalizeSource(row.source),
    sourceUpdatedAt: row.source_updated_at?.getTime() ?? null,
    freshnessState: normalizeFreshnessState(row.freshness_state),
  }));
}

export async function upsertPersistedQuotes(quotes: PersistedQuoteEntry[]): Promise<void> {
  for (const quote of quotes) {
    await db
      .insert(quote_cache)
      .values({
        symbol: quote.symbol,
        name: quote.name,
        price: quote.price,
        prev_close: quote.prevClose,
        open: quote.open,
        high: quote.high,
        low: quote.low,
        volume: quote.volume,
        change: quote.change,
        change_pct: quote.changePct,
        fetched_at: new Date(quote.fetchedAt),
        bid: quote.bid,
        ask: quote.ask,
        source: quote.source,
        source_updated_at: quote.sourceUpdatedAt ? new Date(quote.sourceUpdatedAt) : null,
        freshness_state: quote.freshnessState,
      })
      .onConflictDoUpdate({
        target: quote_cache.symbol,
        set: {
          name: quote.name,
          price: quote.price,
          prev_close: quote.prevClose,
          open: quote.open,
          high: quote.high,
          low: quote.low,
          volume: quote.volume,
          change: quote.change,
          change_pct: quote.changePct,
          fetched_at: new Date(quote.fetchedAt),
          bid: quote.bid,
          ask: quote.ask,
          source: quote.source,
          source_updated_at: quote.sourceUpdatedAt ? new Date(quote.sourceUpdatedAt) : null,
          freshness_state: quote.freshnessState,
          updated_at: new Date(),
        },
      });
  }
}

export async function deletePersistedQuote(symbol: string): Promise<void> {
  await db.delete(quote_cache).where(eq(quote_cache.symbol, symbol));
}

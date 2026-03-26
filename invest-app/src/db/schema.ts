import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const watchlist = sqliteTable(
  'watchlist',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    symbol: text('symbol').notNull(),
    name: text('name').notNull(),
    sort_order: integer('sort_order').notNull().default(0),
    created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
  },
  (t) => [uniqueIndex('watchlist_symbol_unique').on(t.symbol)]
);

export const price_alerts = sqliteTable(
  'price_alerts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    symbol: text('symbol').notNull(),
    name: text('name').notNull(),
    upper_price: real('upper_price'),
    lower_price: real('lower_price'),
    upper_status: text('upper_status').notNull().default('active'),
    lower_status: text('lower_status').notNull().default('active'),
    created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
  },
  (t) => [uniqueIndex('price_alerts_symbol_unique').on(t.symbol)]
);

export const daily_summaries = sqliteTable('daily_summaries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  symbol: text('symbol').notNull(),
  date: text('date').notNull(),
  content: text('content').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
});

export const analysis_cache = sqliteTable(
  'analysis_cache',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    symbol: text('symbol').notNull(),
    content: text('content').notNull(),
    cached_at: integer('cached_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
    updated_at: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
  },
  (t) => [uniqueIndex('analysis_cache_symbol_unique').on(t.symbol)]
);

export const quote_cache = sqliteTable(
  'quote_cache',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    symbol: text('symbol').notNull(),
    name: text('name').notNull(),
    price: real('price'),
    prev_close: real('prev_close').notNull(),
    open: real('open'),
    high: real('high'),
    low: real('low'),
    volume: real('volume').notNull().default(0),
    change: real('change').notNull().default(0),
    change_pct: real('change_pct').notNull().default(0),
    fetched_at: integer('fetched_at', { mode: 'timestamp' }),
    bid: real('bid'),
    ask: real('ask'),
    source: text('source').notNull().default('prev_close'),
    source_updated_at: integer('source_updated_at', { mode: 'timestamp' }),
    freshness_state: text('freshness_state').notNull().default('fresh'),
    created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
    updated_at: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
  },
  (t) => [uniqueIndex('quote_cache_symbol_unique').on(t.symbol)]
);

export const holdings = sqliteTable(
  'holdings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    symbol: text('symbol').notNull(),
    name: text('name').notNull(),
    quantity: real('quantity').notNull().default(0),
    entry_price: real('entry_price'),
    created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
    updated_at: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
  },
  (t) => [uniqueIndex('holdings_symbol_unique').on(t.symbol)]
);

export const portfolio_ai_state = sqliteTable('portfolio_ai_state', {
  id: integer('id').primaryKey(),
  last_analysis: text('last_analysis'),
  chat_history: text('chat_history').notNull().default('[]'),
  suggested_questions: text('suggested_questions').notNull().default('[]'),
  suggested_questions_source: text('suggested_questions_source').notNull().default('ai'),
  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
  updated_at: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
});

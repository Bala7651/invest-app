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

export const holdings = sqliteTable(
  'holdings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    symbol: text('symbol').notNull(),
    name: text('name').notNull(),
    quantity: real('quantity').notNull().default(0),
    created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
    updated_at: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
      () => new Date()
    ),
  },
  (t) => [uniqueIndex('holdings_symbol_unique').on(t.symbol)]
);

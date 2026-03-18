import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

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

export const daily_summaries = sqliteTable('daily_summaries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  symbol: text('symbol').notNull(),
  date: text('date').notNull(),
  content: text('content').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
});

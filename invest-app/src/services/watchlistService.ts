import { asc, eq, max } from 'drizzle-orm';
import { db } from '../db/client';
import { watchlist } from '../db/schema';
import type { WatchlistItem } from '../features/watchlist/store/watchlistStore';

export async function getAll(): Promise<WatchlistItem[]> {
  const rows = await db
    .select({
      id: watchlist.id,
      symbol: watchlist.symbol,
      name: watchlist.name,
      sort_order: watchlist.sort_order,
    })
    .from(watchlist)
    .orderBy(asc(watchlist.sort_order));
  return rows;
}

export async function insertItem(symbol: string, name: string): Promise<WatchlistItem> {
  const result = await db
    .select({ maxOrder: max(watchlist.sort_order) })
    .from(watchlist);
  const maxOrder = result[0]?.maxOrder ?? -1;
  const sort_order = (maxOrder ?? -1) + 1;

  const inserted = await db
    .insert(watchlist)
    .values({ symbol, name, sort_order })
    .returning({
      id: watchlist.id,
      symbol: watchlist.symbol,
      name: watchlist.name,
      sort_order: watchlist.sort_order,
    });

  return inserted[0];
}

export async function deleteItem(id: number): Promise<void> {
  await db.delete(watchlist).where(eq(watchlist.id, id));

  const remaining = await db
    .select({ id: watchlist.id })
    .from(watchlist)
    .orderBy(asc(watchlist.sort_order));

  for (let i = 0; i < remaining.length; i++) {
    await db
      .update(watchlist)
      .set({ sort_order: i })
      .where(eq(watchlist.id, remaining[i].id));
  }
}

export async function updateSortOrders(
  items: { id: number; sort_order: number }[]
): Promise<void> {
  for (const item of items) {
    await db
      .update(watchlist)
      .set({ sort_order: item.sort_order })
      .where(eq(watchlist.id, item.id));
  }
}

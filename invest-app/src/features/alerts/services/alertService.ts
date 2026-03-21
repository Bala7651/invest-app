import { eq, or } from 'drizzle-orm';
import { db } from '../../../db/client';
import { price_alerts } from '../../../db/schema';

export interface AlertRow {
  id: number;
  symbol: string;
  name: string;
  upper_price: number | null;
  lower_price: number | null;
  upper_status: 'active' | 'triggered';
  lower_status: 'active' | 'triggered';
}

export async function upsertAlert(
  symbol: string,
  name: string,
  upper_price: number | null,
  lower_price: number | null
): Promise<void> {
  await db.delete(price_alerts).where(eq(price_alerts.symbol, symbol));
  await db.insert(price_alerts).values({
    symbol,
    name,
    upper_price,
    lower_price,
    upper_status: 'active',
    lower_status: 'active',
  });
}

export async function getAll(): Promise<AlertRow[]> {
  const rows = await db.select().from(price_alerts);
  return rows as AlertRow[];
}

export async function deleteAlert(id: number): Promise<void> {
  await db.delete(price_alerts).where(eq(price_alerts.id, id));
}

export async function markTriggered(
  symbol: string,
  direction: 'upper' | 'lower'
): Promise<void> {
  if (direction === 'upper') {
    await db
      .update(price_alerts)
      .set({ upper_status: 'triggered' })
      .where(eq(price_alerts.symbol, symbol));
  } else {
    await db
      .update(price_alerts)
      .set({ lower_status: 'triggered' })
      .where(eq(price_alerts.symbol, symbol));
  }
}

export async function reEnableDirection(
  symbol: string,
  direction: 'upper' | 'lower'
): Promise<void> {
  if (direction === 'upper') {
    await db
      .update(price_alerts)
      .set({ upper_status: 'active' })
      .where(eq(price_alerts.symbol, symbol));
  } else {
    await db
      .update(price_alerts)
      .set({ lower_status: 'active' })
      .where(eq(price_alerts.symbol, symbol));
  }
}

export async function getActiveSymbols(): Promise<string[]> {
  const rows = await db
    .select({ symbol: price_alerts.symbol })
    .from(price_alerts)
    .where(
      or(
        eq(price_alerts.upper_status, 'active'),
        eq(price_alerts.lower_status, 'active')
      )
    );
  return [...new Set(rows.map(r => r.symbol))];
}

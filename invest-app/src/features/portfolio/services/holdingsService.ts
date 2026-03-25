import { eq } from 'drizzle-orm';
import { db } from '../../../db/client';
import { holdings } from '../../../db/schema';

export interface HoldingRow {
  id: number;
  symbol: string;
  name: string;
  quantity: number;
  entry_price: number | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export async function upsertHolding(
  symbol: string,
  name: string,
  quantity: number,
  entryPrice: number | null = null,
): Promise<void> {
  await db
    .insert(holdings)
    .values({ symbol, name, quantity, entry_price: entryPrice })
    .onConflictDoUpdate({
      target: holdings.symbol,
      set: {
        name,
        quantity,
        entry_price: entryPrice,
        updated_at: new Date(),
      },
    });
}

export async function getAllHoldings(): Promise<HoldingRow[]> {
  const rows = await db.select().from(holdings);
  return rows as HoldingRow[];
}

export async function deleteHolding(symbol: string): Promise<void> {
  await db.delete(holdings).where(eq(holdings.symbol, symbol));
}

import stocksData from '../../../assets/stocks.json';

export interface StockEntry {
  code: string;
  name: string;
}

const stocks: StockEntry[] = stocksData as StockEntry[];

export function filterStocks(query: string): StockEntry[] {
  if (!query) return [];
  const q = query.trim();
  if (!q) return [];
  const results = stocks.filter(
    s => s.code.includes(q) || s.name.includes(q)
  );
  return results.slice(0, 50);
}

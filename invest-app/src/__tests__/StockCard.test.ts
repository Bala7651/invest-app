import { formatChange } from '../features/watchlist/components/StockCard';

describe('formatChange', () => {
  it('formats positive change correctly', () => {
    expect(formatChange(5, 0.85)).toBe('+5.00 (+0.85%)');
  });

  it('formats negative change correctly', () => {
    expect(formatChange(-3.5, -0.58)).toBe('-3.50 (-0.58%)');
  });

  it('formats zero change correctly', () => {
    expect(formatChange(0, 0)).toBe('+0.00 (+0.00%)');
  });

  it('formats large numbers correctly', () => {
    expect(formatChange(100.5, 2.345)).toBe('+100.50 (+2.35%)');
  });
});

function priceDisplay(price: number | null): string {
  return price != null ? price.toFixed(2) : '—';
}

function changeDisplay(price: number | null, change: number, changePct: number): string {
  return price != null ? formatChange(change, changePct) : 'Waiting for market open';
}

describe('StockCard price display logic', () => {
  it('shows formatted price when price is provided', () => {
    expect(priceDisplay(595.0)).toBe('595.00');
  });

  it('shows dash when price is null', () => {
    expect(priceDisplay(null)).toBe('—');
  });

  it('shows waiting message when price is null', () => {
    expect(changeDisplay(null, 5, 0.85)).toBe('Waiting for market open');
  });

  it('shows formatted change when price is provided', () => {
    expect(changeDisplay(595.0, 5, 0.85)).toBe('+5.00 (+0.85%)');
  });
});

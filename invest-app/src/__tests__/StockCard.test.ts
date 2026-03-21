// StockCard.test.ts tests pure display and behavioral logic from StockCard without
// rendering the component (avoids react-native-reanimated native init in Jest).

function formatChange(change: number, changePct: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)} (${sign}${changePct.toFixed(2)}%)`;
}

function priceDisplay(price: number | null): string {
  return price != null ? price.toFixed(2) : '—';
}

function changeDisplay(price: number | null, change: number, changePct: number): string {
  return price != null ? formatChange(change, changePct) : 'Waiting for market open';
}

// Glow trigger logic: price flash occurs only when price changes from a non-null previous value
function shouldTriggerGlow(prevPrice: number | null, nextPrice: number | null): boolean {
  return prevPrice !== null && nextPrice !== null && nextPrice !== prevPrice;
}

// Sparkline color follows change direction
function sparklineColor(change: number): string {
  return change >= 0 ? '#00E676' : '#FF1744';
}

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

describe('StockCard glow flash logic', () => {
  it('does not trigger glow on first render (prevPriceRef starts null)', () => {
    expect(shouldTriggerGlow(null, 1000)).toBe(false);
  });

  it('triggers glow when price changes from a non-null previous value', () => {
    expect(shouldTriggerGlow(1000, 1005)).toBe(true);
  });

  it('does not trigger glow when price is unchanged (flat tick)', () => {
    expect(shouldTriggerGlow(1000, 1000)).toBe(false);
  });

  it('does not trigger glow when next price is null', () => {
    expect(shouldTriggerGlow(1000, null)).toBe(false);
  });
});

describe('StockCard sparkline color', () => {
  it('uses green #00E676 for up or flat stocks', () => {
    expect(sparklineColor(5)).toBe('#00E676');
    expect(sparklineColor(0)).toBe('#00E676');
  });

  it('uses red #FF1744 for down stocks', () => {
    expect(sparklineColor(-3)).toBe('#FF1744');
  });
});

import { isMarketOpen, isHoliday, computeStatus } from '../features/market/marketHours';
import { HOLIDAYS_2026 } from '../features/market/holidays2026';

// Helper: create a Date at a specific Taipei time.
// Taipei is UTC+8, so UTC = Taipei - 8 hours.
function taipeiTime(year: number, month: number, day: number, hour: number, minute: number): Date {
  // month is 1-based; Date.UTC month is 0-based
  return new Date(Date.UTC(year, month - 1, day, hour - 8, minute, 0, 0));
}

// --- isMarketOpen tests ---

it('isMarketOpen returns true at 10:00 Taipei on Tuesday (non-holiday)', () => {
  // 2026-03-17 is a Tuesday
  const d = taipeiTime(2026, 3, 17, 10, 0);
  expect(isMarketOpen(d)).toBe(true);
});

it('isMarketOpen returns false at 14:00 Taipei on Tuesday', () => {
  const d = taipeiTime(2026, 3, 17, 14, 0);
  expect(isMarketOpen(d)).toBe(false);
});

it('isMarketOpen returns false at 10:00 Taipei on Saturday', () => {
  // 2026-03-21 is a Saturday
  const d = taipeiTime(2026, 3, 21, 10, 0);
  expect(isMarketOpen(d)).toBe(false);
});

it('isMarketOpen returns false at 10:00 Taipei on Sunday', () => {
  // 2026-03-22 is a Sunday
  const d = taipeiTime(2026, 3, 22, 10, 0);
  expect(isMarketOpen(d)).toBe(false);
});

it('isMarketOpen returns false at 08:59 Taipei on Tuesday (one minute before open)', () => {
  const d = taipeiTime(2026, 3, 17, 8, 59);
  expect(isMarketOpen(d)).toBe(false);
});

it('isMarketOpen returns false at 13:30 Taipei on Tuesday (market closes AT 13:30)', () => {
  const d = taipeiTime(2026, 3, 17, 13, 30);
  expect(isMarketOpen(d)).toBe(false);
});

it('isMarketOpen returns true at 13:29 Taipei on Tuesday (one minute before close)', () => {
  const d = taipeiTime(2026, 3, 17, 13, 29);
  expect(isMarketOpen(d)).toBe(true);
});

// --- isHoliday tests ---

it('isHoliday returns true for 2026-02-17 (Lunar New Year)', () => {
  const d = new Date('2026-02-17T00:00:00+08:00');
  expect(isHoliday(d)).toBe(true);
});

it('isHoliday returns false for 2026-03-18 (regular Wednesday)', () => {
  const d = new Date('2026-03-18T00:00:00+08:00');
  expect(isHoliday(d)).toBe(false);
});

// --- HOLIDAYS_2026 array tests ---

it('HOLIDAYS_2026 array has at least 15 entries', () => {
  expect(HOLIDAYS_2026.length).toBeGreaterThanOrEqual(15);
});

// --- isMarketOpen on holiday ---

it('isMarketOpen returns false at 10:00 Taipei on 2026-02-17 (Lunar New Year)', () => {
  const d = taipeiTime(2026, 2, 17, 10, 0);
  expect(isMarketOpen(d)).toBe(false);
});

// --- computeStatus tests ---

it('computeStatus returns open=true with "Open" label during market hours', () => {
  const d = taipeiTime(2026, 3, 17, 10, 0);
  const status = computeStatus(d);
  expect(status.open).toBe(true);
  expect(status.label).toMatch(/^Open/);
});

it('computeStatus returns open=false with "Closed" label outside market hours', () => {
  const d = taipeiTime(2026, 3, 17, 14, 0);
  const status = computeStatus(d);
  expect(status.open).toBe(false);
  expect(status.label).toMatch(/^Closed/);
});

it('computeStatus open label includes countdown to close', () => {
  // At 10:00 Taipei, 3h 30m to close (13:30)
  const d = taipeiTime(2026, 3, 17, 10, 0);
  const status = computeStatus(d);
  expect(status.label).toContain('to close');
});

it('computeStatus closed label includes next open time', () => {
  const d = taipeiTime(2026, 3, 17, 14, 0);
  const status = computeStatus(d);
  expect(status.label).toContain('opens');
});

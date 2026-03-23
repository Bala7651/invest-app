import { HOLIDAYS_2026 } from './holidays2026';

// Taiwan Standard Time = UTC+8, no DST
// Use fixed offset instead of toLocaleString — Hermes doesn't reliably parse
// locale-formatted date strings (e.g. "3/23/2026, 9:30:00 AM") back via new Date()
const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;

function toTaipeiDate(utc: Date): Date {
  return new Date(utc.getTime() + TAIPEI_OFFSET_MS);
}

function toISODate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function isHoliday(date: Date): boolean {
  const iso = toISODate(date);
  return HOLIDAYS_2026.includes(iso);
}

export function isMarketOpen(now = new Date()): boolean {
  const taipei = toTaipeiDate(now);
  const day = taipei.getUTCDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  if (isHoliday(taipei)) return false;
  const h = taipei.getUTCHours();
  const m = taipei.getUTCMinutes();
  const mins = h * 60 + m;
  return mins >= 9 * 60 && mins < 13 * 60 + 30;
}

export function computeStatus(now = new Date()): { open: boolean; label: string } {
  const taipei = toTaipeiDate(now);
  const open = isMarketOpen(now);

  if (open) {
    const closeMins = 13 * 60 + 30;
    const currentMins = taipei.getUTCHours() * 60 + taipei.getUTCMinutes();
    const remaining = closeMins - currentMins;
    const h = Math.floor(remaining / 60);
    const m = remaining % 60;
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}時`);
    if (m > 0) parts.push(`${m}分`);
    return { open: true, label: `開盤中 · 距收盤 ${parts.join('')}` };
  }

  // Find the next market open: check upcoming days up to 7 days ahead
  for (let i = 1; i <= 7; i++) {
    const candidate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const candidateTaipei = toTaipeiDate(candidate);
    const day = candidateTaipei.getUTCDay();
    if (day !== 0 && day !== 6 && !isHoliday(candidateTaipei)) {
      return { open: false, label: '休市 · 09:00 開盤' };
    }
  }

  return { open: false, label: '休市' };
}

import { HOLIDAYS_2026 } from './holidays2026';

function toTaipeiDate(utc: Date): Date {
  const str = utc.toLocaleString('en-US', { timeZone: 'Asia/Taipei' });
  return new Date(str);
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isHoliday(date: Date): boolean {
  const iso = toISODate(date);
  return HOLIDAYS_2026.includes(iso);
}

export function isMarketOpen(now = new Date()): boolean {
  const taipei = toTaipeiDate(now);
  const day = taipei.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  if (isHoliday(taipei)) return false;
  const h = taipei.getHours();
  const m = taipei.getMinutes();
  const mins = h * 60 + m;
  return mins >= 9 * 60 && mins < 13 * 60 + 30;
}

export function computeStatus(now = new Date()): { open: boolean; label: string } {
  const taipei = toTaipeiDate(now);
  const open = isMarketOpen(now);

  if (open) {
    const closeMins = 13 * 60 + 30;
    const currentMins = taipei.getHours() * 60 + taipei.getMinutes();
    const remaining = closeMins - currentMins;
    const h = Math.floor(remaining / 60);
    const m = remaining % 60;
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    return { open: true, label: `Open · ${parts.join(' ')} to close` };
  }

  // Find the next market open: check upcoming days up to 7 days ahead
  for (let i = 1; i <= 7; i++) {
    const candidate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const candidateTaipei = toTaipeiDate(candidate);
    const day = candidateTaipei.getDay();
    if (day !== 0 && day !== 6 && !isHoliday(candidateTaipei)) {
      return { open: false, label: 'Closed · opens 09:00' };
    }
  }

  return { open: false, label: 'Closed' };
}

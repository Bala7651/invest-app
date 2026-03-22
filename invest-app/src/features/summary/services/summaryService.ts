import { db } from '../../../db/client';
import { daily_summaries } from '../../../db/schema';
import { eq, lt, and, desc } from 'drizzle-orm';
import { isHoliday } from '../../market/marketHours';
import { Credentials, SummaryEntry } from '../types';

const CUTOFF_DAYS = 14;

function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

// ---------------------------------------------------------------------------
// Date helpers (Taipei timezone — never use toISOString which is UTC)
// ---------------------------------------------------------------------------

function toTaipeiParts(now = new Date()): { year: string; month: string; day: string; hour: number; minute: number; dayOfWeek: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: 'numeric', minute: '2-digit', hour12: false,
    weekday: 'short',
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]));
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parseInt(parts.hour, 10),
    minute: parseInt(parts.minute, 10),
    dayOfWeek: dayMap[parts.weekday] ?? 0,
  };
}

export function getTodayISO(): string {
  const p = toTaipeiParts();
  return `${p.year}-${p.month}-${p.day}`;
}

export function getCutoffISO(): string {
  const now = new Date();
  now.setDate(now.getDate() - CUTOFF_DAYS);
  const p = toTaipeiParts(now);
  return `${p.year}-${p.month}-${p.day}`;
}

export function isCatchUpNeeded(): boolean {
  const p = toTaipeiParts();
  if (p.dayOfWeek === 0 || p.dayOfWeek === 6) return false;
  // Build a Date from parts for holiday check
  const taipei = new Date(parseInt(p.year), parseInt(p.month) - 1, parseInt(p.day));
  if (isHoliday(taipei)) return false;
  const mins = p.hour * 60 + p.minute;
  return mins >= 12 * 60 + 30;
}

// ---------------------------------------------------------------------------
// TWSE index fetch
// ---------------------------------------------------------------------------

interface TWIXEntry {
  '指數': string;
  '收盤指數': string;
  '漲跌': string;
  '漲跌點數': string;
  '漲跌百分比': string;
}

export async function fetchTWIX(): Promise<{ close: number; change: number; changePct: number } | null> {
  try {
    const res = await fetch('https://openapi.twse.com.tw/v1/exchangeReport/MI_INDEX', {
      headers: { 'User-Agent': 'invest-app/1.0' },
      signal: timeoutSignal(6_000),
    });
    if (!res.ok) return null;
    const data: TWIXEntry[] = await res.json();
    const taiex = data.find(e => e['指數'] === '發行量加權股價指數');
    if (!taiex) return null;
    const sign = taiex['漲跌'] === '+' ? 1 : -1;
    return {
      close: parseFloat(taiex['收盤指數']),
      change: sign * parseFloat(taiex['漲跌點數']),
      changePct: sign * parseFloat(taiex['漲跌百分比']),
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Fresh quote from TWSE (used by summary so market-closed state still works)
// ---------------------------------------------------------------------------

export async function fetchLatestQuoteForSummary(symbol: string): Promise<SummaryQuoteData | null> {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const url = `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${now.getFullYear()}${mm}01&stockNo=${symbol}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'invest-app/1.0' },
      signal: timeoutSignal(6_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.data || data.data.length < 2) return null;
    const rows: string[][] = data.data;
    const latest = rows[rows.length - 1];
    const prev = rows[rows.length - 2];
    const parseNum = (s: string) => parseFloat(s.replace(/,/g, ''));
    const close = parseNum(latest[6]);
    const prevClose = parseNum(prev[6]);
    if (isNaN(close) || isNaN(prevClose)) return null;
    const change = close - prevClose;
    const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;
    return { price: close, change, changePct, prevClose };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// AI summary call
// ---------------------------------------------------------------------------

const SUMMARY_SYSTEM_PROMPT = `You are a Taiwan stock market analyst providing brief daily summaries.
ALWAYS respond in Traditional Chinese (繁體中文).
ALWAYS respond with only a plain text paragraph. No JSON, no markdown, no headers.
Keep the summary to 2-3 sentences: mention today's price action, one key technical signal, and short-term outlook.`;

interface SummaryQuoteData {
  price: number | null;
  change: number;
  changePct: number;
  prevClose: number;
}

export function buildSummaryPrompt(symbol: string, name: string, quote: SummaryQuoteData): string {
  return `請為台灣股票 ${symbol}（${name}）生成今日簡短摘要。
今日市場數據（請使用以下實際數據，勿自行編造）：
- 目前價格：${quote.price ?? '無資料'} 元
- 漲跌：${quote.change >= 0 ? '+' : ''}${quote.change.toFixed(2)}（${quote.changePct.toFixed(2)}%）
- 昨收：${quote.prevClose} 元
請用2-3句話說明今日價格走勢、關鍵技術訊號及短期展望。`;
}

export function buildIndexSummaryPrompt(indexData: { close: number; change: number; changePct: number }): string {
  const sign = indexData.change >= 0 ? '+' : '';
  return `請為台灣加權指數（大盤）生成今日簡短摘要。
最新指數資料：
- 指數：${indexData.close.toFixed(2)} 點
- 漲跌：${sign}${indexData.change.toFixed(2)} 點（${sign}${indexData.changePct.toFixed(2)}%）
請用2-3句話說明今日大盤表現、關鍵走勢及短期展望。`;
}

export async function callSummaryMiniMax(
  _symbol: string,
  userPrompt: string,
  credentials: Credentials
): Promise<string> {
  const url = `${credentials.baseUrl.replace(/\/$/, '')}/chat/completions`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: credentials.modelName,
        messages: [
          { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`MiniMax HTTP ${res.status}`);

    const data = await res.json();
    return (data.choices?.[0]?.message?.content ?? '') as string;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// SQLite CRUD
// ---------------------------------------------------------------------------

export async function upsertSummary(symbol: string, date: string, content: string): Promise<void> {
  await db
    .delete(daily_summaries)
    .where(and(eq(daily_summaries.symbol, symbol), eq(daily_summaries.date, date)));
  await db.insert(daily_summaries).values({ symbol, date, content });
}

export async function purgeOldSummaries(): Promise<void> {
  const cutoff = getCutoffISO();
  await db.delete(daily_summaries).where(lt(daily_summaries.date, cutoff));
}

export async function loadAllSummaries(): Promise<SummaryEntry[]> {
  const rows = await db
    .select()
    .from(daily_summaries)
    .orderBy(desc(daily_summaries.date), desc(daily_summaries.created_at));
  return rows as SummaryEntry[];
}

export async function hasSummaryForDate(date: string): Promise<boolean> {
  const rows = await db
    .select({ id: daily_summaries.id })
    .from(daily_summaries)
    .where(eq(daily_summaries.date, date))
    .limit(1);
  return rows.length > 0;
}

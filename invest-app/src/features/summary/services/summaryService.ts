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
// Fresh quote + MA from TWSE STOCK_DAY (works outside market hours too)
// ---------------------------------------------------------------------------

function prevMonthYear(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

async function fetchStockDayRows(symbol: string, year: number, month: number): Promise<string[][]> {
  const mm = String(month).padStart(2, '0');
  const url = `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${year}${mm}01&stockNo=${symbol}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'invest-app/1.0' },
      signal: timeoutSignal(6_000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.data) ? data.data : [];
  } catch {
    return [];
  }
}

export async function fetchLatestQuoteForSummary(symbol: string): Promise<SummaryQuoteData | null> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  let rows = await fetchStockDayRows(symbol, year, month);

  // Month-boundary: if current month has fewer than 20 trading days, prepend previous month
  if (rows.length < 20) {
    const { year: py, month: pm } = prevMonthYear(year, month);
    const prevRows = await fetchStockDayRows(symbol, py, pm);
    rows = [...prevRows, ...rows];
  }

  if (rows.length < 2) return null;

  const parseNum = (s: string) => parseFloat(s.replace(/,/g, ''));

  // Find the last two rows with a valid closing price.
  // TWSE may include today's row with close="-" before data is finalized.
  let latestIdx = rows.length - 1;
  while (latestIdx >= 0 && isNaN(parseNum(rows[latestIdx][6]))) {
    latestIdx--;
  }
  if (latestIdx < 1) return null;

  const latest = rows[latestIdx];
  const prev   = rows[latestIdx - 1];

  const close    = parseNum(latest[6]);
  const prevClose = parseNum(prev[6]);
  if (isNaN(close) || isNaN(prevClose)) return null;

  const change    = close - prevClose;
  const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;
  const open      = parseNum(latest[3]);
  const high      = parseNum(latest[4]);
  const low       = parseNum(latest[5]);
  // STOCK_DAY volume is in shares; convert to 張 (1 張 = 1000 shares)
  const volumeShares = parseNum(latest[1]);
  const volumeLots   = isNaN(volumeShares) ? null : Math.round(volumeShares / 1000);

  // MA5 / MA20 — use last 20 rows max
  const win20   = rows.slice(-20);
  const closes  = win20.map(r => parseNum(r[6])).filter(n => !isNaN(n));
  // volumes also in shares here; defer /1000 until after averaging
  const volsSh  = win20.map(r => parseNum(r[1])).filter(n => !isNaN(n));

  const ma5 = closes.length >= 5
    ? parseFloat((closes.slice(-5).reduce((a, b) => a + b, 0) / 5).toFixed(2))
    : null;
  const ma20 = closes.length >= 20
    ? parseFloat((closes.reduce((a, b) => a + b, 0) / 20).toFixed(2))
    : null;

  // avgVolume20 in 張; volumeRatio = today 張 / avg 張  (same unit → ratio correct)
  const avgVolume20 = volsSh.length >= 20
    ? Math.round(volsSh.reduce((a, b) => a + b, 0) / 20 / 1000)
    : null;
  const volumeRatio = (avgVolume20 != null && avgVolume20 > 0 && volumeLots != null)
    ? parseFloat((volumeLots / avgVolume20).toFixed(1))
    : null;

  return {
    price: close,
    open:  isNaN(open) ? null : open,
    high:  isNaN(high) ? null : high,
    low:   isNaN(low)  ? null : low,
    volume: volumeLots,
    change,
    changePct,
    prevClose,
    ma5,
    ma20,
    avgVolume20,
    volumeRatio,
  };
}

// ---------------------------------------------------------------------------
// AI summary call
// ---------------------------------------------------------------------------

const SUMMARY_SYSTEM_PROMPT = `你是一位專業的台灣股市分析師，負責撰寫每日精簡的盤勢與個股摘要，你將會搜尋網路來確定以下的內容架構。

【格式規則】
1. 全程使用繁體中文。
2. 純文字段落，禁止 JSON、Markdown、標題或任何特殊排版。
3. 以 4-6 句話完成摘要，每句話簡短有力，不超過 30 字。
4. 句與句之間自然銜接，形成一個連貫段落。

【內容架構】
第一句：今天的收盤結果，漲跌方向與幅度。
第二句：盤中走勢特徵，根據開盤與高低點判斷（開高走低、低檔反彈、區間震盪等）。
第三句：量能觀察，根據量比判斷今日交易活躍度（放量突破、縮量整理、量能持平等）。
第四句：技術面位置，根據現價與均線的相對關係描述多空格局。如未提供均線數據則跳過此句。
第五至六句：短期展望與需關注的支撐壓力或事件。

【溝通風格】
- 語氣沉穩專業，像資深分析師在晨會上做簡報。
- 客觀中立，禁止聳動用語。
- 只評論用戶提供的數據，絕對不捏造任何未提供的數字或指標。`;

export interface SummaryQuoteData {
  price: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  change: number;
  changePct: number;
  prevClose: number;
  ma5: number | null;
  ma20: number | null;
  avgVolume20: number | null;
  volumeRatio: number | null;
}

export function buildSummaryPrompt(symbol: string, name: string, quote: SummaryQuoteData): string {
  const sign = quote.change >= 0 ? '+' : '';
  return `請為台灣股票 ${symbol}（${name}）生成今日簡短摘要。
今日市場數據（請使用以下實際數據，勿自行編造）：
- 目前價格：${quote.price ?? '無資料'} 元
- 漲跌：${sign}${quote.change.toFixed(2)}（${quote.changePct.toFixed(2)}%）
- 昨收：${quote.prevClose} 元
請用2-3句話說明今日價格走勢、關鍵技術訊號及短期展望。`;
}

export function buildIndexSummaryPrompt(indexData: { close: number; change: number; changePct: number }): string {
  const sign = indexData.change >= 0 ? '+' : '';
  return `請為台灣加權指數（大盤）生成今日簡短摘要。
最新指數資料：
- 指數：${indexData.close.toFixed(2)} 點
- 漲跌：${sign}${indexData.change.toFixed(2)} 點（${sign}${indexData.changePct.toFixed(2)}%）
請用 4-5 句話說明今日大盤表現、關鍵走勢及短期展望。`;
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
        max_tokens: 200,
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

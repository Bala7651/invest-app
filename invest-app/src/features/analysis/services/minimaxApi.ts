import { AnalysisResult } from '../types';

const SYSTEM_PROMPT = `你是一位專業的台灣股市分析師，負責對個股進行結構化的量化評估。

【回覆格式】
必須回覆一個 JSON 物件，放在 markdown code block 中。不得包含任何 JSON 以外的文字。

【JSON 欄位定義】

technicalScore（數字，0-100）
基於價格與均線的相對位置、量能變化、今日 K 棒型態的綜合技術面評分。
- 80-100：價格站穩均線之上，量能配合，短線強勢。
- 60-79：價格接近均線，方向未明，觀望格局。
- 40-59：價格在均線附近震盪，多空拉鋸。
- 20-39：價格跌破短期均線，量能不足，偏弱。
- 0-19：價格遠低於均線，持續破底，極弱。
如均線數據未提供，僅根據今日 K 棒與量能評分。

technicalSummary（字串，繁體中文，2-3 句）
描述今日K棒型態（長紅/長黑/十字線/上影線等）、價格與均線關係、量能狀況。只引用用戶提供的數據，不捏造任何指標。

trendPosition（字串，以下四選一）
"多方主導" | "偏多整理" | "偏空整理" | "空方主導"
根據收盤價與 MA5/MA20 的相對位置判斷。如無均線數據，根據今日漲跌幅與 K 棒型態判斷。

volumeSignal（字串，以下四選一）
"顯著放量" | "溫和放量" | "量能持平" | "明顯縮量"
根據量比判斷。量比 > 1.5 為顯著放量，1.1-1.5 為溫和放量，0.8-1.1 為持平，< 0.8 為明顯縮量。如無量比數據，填 "無資料"。

riskLevel（字串，以下三選一）
"低風險" | "中等風險" | "高風險"
根據以下因素綜合判斷：今日振幅（高低價差/昨收）、量能異常程度、價格偏離均線的幅度。

riskExplanation（字串，繁體中文，1-2 句）
解釋風險判斷的具體依據。

outlook（字串，繁體中文，2-3 句）
基於技術面數據的短期展望，包含需關注的支撐壓力位置或觀察重點。語氣客觀中立，不使用「強烈看好」「必定」等詞彙。

overallScore（數字，0-100）
綜合以上所有分析的整體評分。
- 80-100：技術面強勢，量能配合，風險可控。
- 60-79：技術面中性偏多，有正向訊號但未確認。
- 40-59：方向不明或多空拉鋸。
- 20-39：技術面偏弱，缺乏正向支撐。
- 0-19：技術面極弱，多項指標呈負面訊號。

【重要限制】
- 不得捏造任何未提供的數據或指標。
- 不得給出具體目標價。
- 分析基於技術面數據，非投資指令。`;

export interface QuoteData {
  name: string;
  price: number | null;
  change: number;
  changePct: number;
  prevClose: number;
  volume: number | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  volumeRatio?: number | null;
  ma5?: number | null;
  ma20?: number | null;
}

export function buildPrompt(symbol: string, quote: QuoteData): string {
  const sign = quote.change >= 0 ? '+' : '';
  const lines: string[] = [];
  lines.push(`- 收盤價：${quote.price ?? '無資料'} 元`);
  lines.push(`- 漲跌：${sign}${quote.change.toFixed(2)} 元（${quote.changePct.toFixed(2)}%）`);
  lines.push(`- 昨收：${quote.prevClose} 元`);
  if (quote.open        != null) lines.push(`- 開盤：${quote.open} 元`);
  if (quote.high        != null) lines.push(`- 最高：${quote.high} 元`);
  if (quote.low         != null) lines.push(`- 最低：${quote.low} 元`);
  if (quote.volume      != null) lines.push(`- 成交量：${quote.volume} 張`);
  if (quote.volumeRatio != null) lines.push(`- 量比：${quote.volumeRatio}（今日量÷20日均量）`);
  if (quote.ma5         != null) lines.push(`- 5日均價：${quote.ma5} 元`);
  if (quote.ma20        != null) lines.push(`- 20日均價：${quote.ma20} 元`);

  return `請分析台灣股票 ${quote.name}（${symbol}）。
今日數據（以下為實際數據，請據實引用，勿自行編造）：
${lines.join('\n')}
請以 JSON 格式回覆分析結果。`;
}

export function parseAnalysisResponse(content: string): AnalysisResult {
  // MiniMax reasoning models wrap thinking in <think>...</think> — strip it first
  const cleaned = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  // Strategy 1: markdown code block (```json ... ``` or ``` ... ```)
  const codeBlock = cleaned.match(/```[\w]*\s*([\s\S]*?)```/);
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1].trim()) as AnalysisResult; } catch {}
  }

  // Strategy 2: raw JSON object — find outermost { ... }
  const rawJson = cleaned.match(/(\{[\s\S]*\})/);
  if (rawJson) {
    try { return JSON.parse(rawJson[1]) as AnalysisResult; } catch {}
  }

  // Strategy 3: the entire cleaned string is JSON
  try { return JSON.parse(cleaned) as AnalysisResult; } catch {}

  throw new Error('No JSON found in response');
}

export async function callMiniMax(
  symbol: string,
  quote: QuoteData,
  credentials: { apiKey: string; modelName: string; baseUrl: string }
): Promise<AnalysisResult> {
  const prompt = buildPrompt(symbol, quote);
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
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 900,
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`MiniMax HTTP ${res.status}`);

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? '';
    return parseAnalysisResponse(content);
  } finally {
    clearTimeout(timer);
  }
}

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

const REPAIR_SYSTEM_PROMPT = `你是一個只負責輸出有效 JSON 的格式修復器。

任務：
1. 將使用者提供的內容整理成一個有效 JSON 物件。
2. 只能輸出 JSON，不得包含 markdown、解釋、前言或額外文字。
3. JSON 欄位必須完整包含：
technicalScore, technicalSummary, trendPosition, volumeSignal, riskLevel, riskExplanation, outlook, overallScore
4. 若原文缺少部分資訊，可依原文內容做最保守、最中性的補全，但不得虛構具體價格或數據。`;

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

type ProviderKind = 'minimax' | 'openai' | 'gemini' | 'other';

function detectProvider(baseUrl: string): ProviderKind {
  if (baseUrl.includes('minimax.io')) return 'minimax';
  if (baseUrl.includes('api.openai.com')) return 'openai';
  if (baseUrl.includes('generativelanguage.googleapis.com')) return 'gemini';
  return 'other';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value);
}

function extractMessageText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object') {
        if ('text' in part && typeof part.text === 'string') return part.text;
        if ('content' in part && typeof part.content === 'string') return part.content;
      }
      return '';
    })
    .filter(Boolean)
    .join('\n')
    .trim();
}

function extractChoiceContent(data: any): string {
  const message = data?.choices?.[0]?.message;
  const content = extractMessageText(message?.content);
  if (content) return content;
  return typeof data?.output_text === 'string' ? data.output_text : '';
}

function buildChatBody(
  credentials: { modelName: string; baseUrl: string },
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
): Record<string, unknown> {
  const provider = detectProvider(credentials.baseUrl);
  const body: Record<string, unknown> = {
    model: credentials.modelName,
    messages,
    temperature: 0.2,
    max_tokens: 900,
  };

  if (provider === 'openai' || provider === 'gemini') {
    body.response_format = { type: 'json_object' };
  }

  return body;
}

function validateAnalysisShape(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.technicalScore === 'number' &&
    typeof candidate.technicalSummary === 'string' &&
    typeof candidate.trendPosition === 'string' &&
    typeof candidate.volumeSignal === 'string' &&
    typeof candidate.riskLevel === 'string' &&
    typeof candidate.riskExplanation === 'string' &&
    typeof candidate.outlook === 'string' &&
    typeof candidate.overallScore === 'number'
  );
}

function buildFallbackAnalysis(quote: QuoteData): AnalysisResult {
  const price = quote.price ?? quote.prevClose;
  const changePct = quote.changePct;
  const amplitudePct =
    quote.high != null && quote.low != null && quote.prevClose > 0
      ? ((quote.high - quote.low) / quote.prevClose) * 100
      : Math.abs(changePct);
  const ma5GapPct =
    quote.ma5 != null && quote.ma5 !== 0
      ? ((price - quote.ma5) / quote.ma5) * 100
      : null;
  const ma20GapPct =
    quote.ma20 != null && quote.ma20 !== 0
      ? ((price - quote.ma20) / quote.ma20) * 100
      : null;
  const volumeSignal: AnalysisResult['volumeSignal'] =
    quote.volumeRatio == null
      ? '無資料'
      : quote.volumeRatio > 1.5
        ? '顯著放量'
        : quote.volumeRatio > 1.1
          ? '溫和放量'
          : quote.volumeRatio >= 0.8
            ? '量能持平'
            : '明顯縮量';

  let trendPosition: AnalysisResult['trendPosition'];
  if (quote.ma5 != null && quote.ma20 != null) {
    if (price >= quote.ma5 && price >= quote.ma20) {
      trendPosition = '多方主導';
    } else if (price >= quote.ma5 || price >= quote.ma20) {
      trendPosition = changePct >= 0 ? '偏多整理' : '偏空整理';
    } else {
      trendPosition = '空方主導';
    }
  } else if (changePct >= 1.5) {
    trendPosition = '多方主導';
  } else if (changePct >= 0) {
    trendPosition = '偏多整理';
  } else if (changePct > -1.5) {
    trendPosition = '偏空整理';
  } else {
    trendPosition = '空方主導';
  }

  let technicalScore = 50;
  technicalScore += clamp(changePct * 4, -18, 18);
  if (ma5GapPct != null) technicalScore += clamp(ma5GapPct * 2.5, -12, 12);
  if (ma20GapPct != null) technicalScore += clamp(ma20GapPct * 2, -15, 15);
  if (quote.volumeRatio != null) technicalScore += clamp((quote.volumeRatio - 1) * 18, -8, 12);
  technicalScore = round(clamp(technicalScore, 0, 100));

  const deviationPct = Math.max(Math.abs(ma5GapPct ?? 0), Math.abs(ma20GapPct ?? 0));
  const riskLevel: AnalysisResult['riskLevel'] =
    amplitudePct >= 6 || Math.abs(changePct) >= 4 || deviationPct >= 6
      ? '高風險'
      : amplitudePct >= 3 || Math.abs(changePct) >= 2 || deviationPct >= 3
        ? '中等風險'
        : '低風險';

  const riskExplanation =
    riskLevel === '高風險'
      ? `今日振幅約 ${amplitudePct.toFixed(2)}%，且價格波動偏大，短線追價需控制風險。`
      : riskLevel === '中等風險'
        ? `今日振幅約 ${amplitudePct.toFixed(2)}%，波動仍在可觀察範圍，但不宜忽視短線拉回風險。`
        : `今日振幅約 ${amplitudePct.toFixed(2)}%，波動相對溫和，短線風險仍屬可控。`;

  const maContext =
    quote.ma5 != null && quote.ma20 != null
      ? `收盤位置相對 5 日與 20 日均線呈現${trendPosition}。`
      : '目前均線資料有限，主要依據當日漲跌與高低點區間判讀。';
  const volumeContext =
    volumeSignal === '無資料'
      ? '量能資料有限，後續宜觀察是否有補量。'
      : `量能表現屬於「${volumeSignal}」，可作為短線動能的參考。`;
  const direction =
    changePct > 0 ? '收盤走高' : changePct < 0 ? '收盤走弱' : '收盤持平附近震盪';

  const technicalSummary = `今日股價${direction}，單日漲跌幅為 ${changePct.toFixed(2)}%。${maContext}${volumeContext}`;
  const outlook =
    trendPosition === '多方主導'
      ? '短線仍以偏多節奏看待，後續可觀察高點是否持續墊高，以及量能是否延續。'
      : trendPosition === '偏多整理'
        ? '短線處於整理偏多格局，宜觀察支撐是否穩定，以及突破時是否伴隨量能放大。'
        : trendPosition === '偏空整理'
          ? '短線偏弱整理，宜優先觀察支撐區是否守穩，避免弱勢反彈後再次轉回下行。'
          : '短線結構偏空，後續應觀察是否止跌並重新站回關鍵均線，否則仍須保守看待。';

  const riskPenalty = riskLevel === '高風險' ? 16 : riskLevel === '中等風險' ? 8 : 0;
  const overallScore = round(clamp(technicalScore - riskPenalty + (volumeSignal === '顯著放量' ? 4 : 0), 0, 100));

  return {
    technicalScore,
    technicalSummary,
    trendPosition,
    volumeSignal,
    riskLevel,
    riskExplanation,
    outlook,
    overallScore,
  };
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
  const codeBlock = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlock) {
    try {
      const parsed = JSON.parse(codeBlock[1].trim());
      if (validateAnalysisShape(parsed)) return parsed;
    } catch {}
  }

  // Strategy 2: raw JSON object — find outermost { ... }
  const rawJson = cleaned.match(/(\{[\s\S]*\})/);
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson[1]);
      if (validateAnalysisShape(parsed)) return parsed;
    } catch {}
  }

  // Strategy 3: the entire cleaned string is JSON
  try {
    const parsed = JSON.parse(cleaned);
    if (validateAnalysisShape(parsed)) return parsed;
  } catch {}

  throw new Error('No JSON found in response');
}

async function repairAnalysisResponse(
  rawContent: string,
  credentials: { apiKey: string; modelName: string; baseUrl: string }
): Promise<AnalysisResult | null> {
  if (!rawContent.trim()) return null;

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
      body: JSON.stringify(
        buildChatBody(credentials, [
          { role: 'system', content: REPAIR_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `請把以下內容整理成有效 JSON，只能輸出 JSON：\n\n${rawContent}`,
          },
        ])
      ),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = await res.json();
    const content = extractChoiceContent(data);
    return parseAnalysisResponse(content);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function callMiniMax(
  symbol: string,
  quote: QuoteData,
  credentials: { apiKey: string; modelName: string; baseUrl: string }
): Promise<AnalysisResult> {
  const prompt = buildPrompt(symbol, quote);
  const url = `${credentials.baseUrl.replace(/\/$/, '')}/chat/completions`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        buildChatBody(credentials, [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ])
      ),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`MiniMax HTTP ${res.status}`);

    const data = await res.json();
    const content = extractChoiceContent(data);

    try {
      return parseAnalysisResponse(content);
    } catch {
      const repaired = await repairAnalysisResponse(content, credentials);
      if (repaired) return repaired;
      return buildFallbackAnalysis(quote);
    }
  } finally {
    clearTimeout(timer);
  }
}

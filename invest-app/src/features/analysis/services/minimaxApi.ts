import { AnalysisResult } from '../types';

const SYSTEM_PROMPT = `You are a Taiwan stock market analyst. ALWAYS respond in Traditional Chinese (繁體中文).
ALWAYS respond with a single JSON object in a markdown code block. No other text.
Required fields:
- sentimentScore: number 0-100 (100 = extremely bullish)
- sentimentLabel: "看漲" | "中性" | "看跌"
- sentimentSummary: string (1-2 sentences in 繁體中文, market/news context)
- technicalSummary: string (2-3 sentences in 繁體中文, plain language)
- recommendation: "買入" | "持有" | "賣出"
- recommendationReasoning: string (2-3 sentences in 繁體中文)
- riskScore: number 0-100 (100 = highest risk)
- riskExplanation: string (1-2 sentences in 繁體中文)
- overallScore: number 0-100`;

export interface QuoteData {
  name: string;
  price: number | null;
  change: number;
  changePct: number;
  prevClose: number;
  volume: number;
}

export function buildPrompt(symbol: string, quote: QuoteData): string {
  return `Analyze Taiwan stock ${symbol} (${quote.name}).
REAL MARKET DATA (use exactly these figures, do not fabricate):
- Current price: ${quote.price ?? 'unavailable'} TWD
- Price change: ${quote.change >= 0 ? '+' : ''}${quote.change.toFixed(2)} (${quote.changePct.toFixed(2)}%)
- Previous close: ${quote.prevClose} TWD
- Volume: ${quote.volume ?? 'unavailable'}
Provide your analysis as a JSON object.`;
}

export function parseAnalysisResponse(content: string): AnalysisResult {
  // MiniMax reasoning models wrap thinking in <think>...</think> — strip it first
  const cleaned = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/) ?? cleaned.match(/(\{[\s\S]*\})/);
  if (!match) throw new Error('No JSON found in response');
  return JSON.parse(match[1]) as AnalysisResult;
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
        temperature: 0.3,
        max_tokens: 600,
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

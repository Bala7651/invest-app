export interface PortfolioEntry {
  symbol: string;
  name: string;
  quantity: number;
  currentPrice: number | null;
}

export interface PortfolioAnalysis {
  score: number;
  paragraph: string;
}

export interface Credentials {
  apiKey: string;
  modelName: string;
  baseUrl: string;
}

const MAX_STOCKS = 15;

const PORTFOLIO_SYSTEM_PROMPT = `你是一位台灣股市投資組合分析師。
請用繁體中文回答，只提供純文字段落，不使用JSON、Markdown或標題。
分析重點：產業集中度、個股相關性、投資風險集中程度，以及整體投資組合健康度。
回答字數限制在150字以內。
最後請在回覆末尾加上「SCORE:XX/100 其中XX為0到100的整數」。`;

export function buildPortfolioPrompt(entries: PortfolioEntry[]): string {
  const limited = entries.slice(0, MAX_STOCKS);
  const stockLines = limited
    .map((e) => {
      const value =
        e.currentPrice != null ? `，現價 ${e.currentPrice} 元` : '';
      return `- ${e.name}（${e.symbol}）：持股 ${e.quantity} 股${value}`;
    })
    .join('\n');

  return `請分析以下台灣股票投資組合的健康度：

${stockLines}

請評估：
1. 產業集中度（哪些產業過度集中）
2. 個股相關性風險（高度相關的股票群組）
3. 整體投資建議

最後以「SCORE:XX/100 其中XX為0到100的整數」結尾，XX為整體投資組合健康分數。`;
}

export function extractHealthScore(response: string): number {
  const match = response.match(/SCORE[：:]\s*(\d{1,3})\s*\/\s*100/i);
  if (!match) return 50; // fallback if AI omits or reformats the tag
  return Math.min(100, Math.max(0, parseInt(match[1], 10)));
}

export async function callPortfolioMiniMax(
  entries: PortfolioEntry[],
  credentials: Credentials
): Promise<PortfolioAnalysis | null> {
  const url = `${credentials.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const userPrompt = buildPortfolioPrompt(entries);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: credentials.modelName,
        messages: [
          { role: 'system', content: PORTFOLIO_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 400,
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = await res.json();
    let content: string = (data.choices?.[0]?.message?.content ?? '') as string;

    // Strip <think>...</think> reasoning tags if present (some models include them)
    content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    if (!content) return null;

    const score = extractHealthScore(content);
    const paragraph = content.replace(/SCORE[：:]\s*\d{1,3}\s*\/\s*100[^\n]*/gi, '').trim();

    return { score, paragraph };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

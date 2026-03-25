export interface PortfolioEntry {
  symbol: string;
  name: string;
  quantity: number;
  currentPrice: number | null;
  entryPrice: number | null;
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

export type ChatMessage = { role: 'user' | 'assistant'; content: string };
export type SuggestedQuestionsSource = 'ai' | 'fallback';

export interface SuggestedQuestionsResult {
  questions: string[];
  source: SuggestedQuestionsSource;
}

const MAX_STOCKS = 15;

const INDUSTRY_MAP: Record<string, string> = {
  // 半導體
  '2330': '半導體', '2303': '半導體', '2344': '半導體', '3711': '半導體',
  '2408': '半導體', '2355': '半導體', '6770': '半導體', '2337': '半導體',
  // IC設計
  '2454': 'IC設計', '2379': 'IC設計', '3034': 'IC設計', '2388': 'IC設計',
  '3443': 'IC設計', '3019': 'IC設計', '2385': 'IC設計',
  // 電子製造
  '2317': '電子製造', '4938': '電子製造', '3231': '電子製造', '2354': '電子製造',
  // 電腦及週邊
  '2382': '電腦及週邊', '2357': '電腦及週邊', '2353': '電腦及週邊',
  // 被動元件
  '2327': '被動元件', '2301': '電子零組件',
  // 光學/面板
  '3008': '光學元件', '2409': '面板', '3481': '面板',
  // 電信
  '2412': '電信', '3045': '電信', '4904': '電信',
  // 金融
  '2882': '金融', '2881': '金融', '2886': '金融', '2891': '金融',
  '2884': '金融', '2885': '金融', '2892': '金融', '5880': '金融',
  '2883': '金融', '2887': '金融', '2890': '金融', '2888': '金融',
  // 塑化/化工
  '1301': '塑化', '1303': '塑化', '1326': '塑化',
  // 鋼鐵/水泥/原材料
  '2002': '鋼鐵', '2006': '鋼鐵', '1101': '水泥', '1102': '水泥',
  // 食品/消費
  '1216': '食品',
  // 汽車
  '2207': '汽車', '2201': '汽車',
  // 航運
  '2603': '航運', '2615': '航運', '2609': '航運', '2614': '航運',
};

function getIndustry(symbol: string): string {
  return INDUSTRY_MAP[symbol] ?? '未分類';
}

const PORTFOLIO_SYSTEM_PROMPT = `你是一位資深台灣股市投資組合顧問，隸屬聲譽卓著的金融機構，專為高淨值客戶提供深度投資分析與長期理財規劃。你的專長涵蓋個股基本面評估、產業輪動週期判斷、風險情境模擬，以及持股策略建議。你將會依照客人持股的額度和今天市場上的額度去做分析:

【回覆模式】
你有兩種回覆模式，根據用戶的訊息自動切換：

模式一「完整報告」：用戶要求分析整體投資組合時使用。
- 字數控制在 600-800 字。
- 純文字段落，禁止 JSON、Markdown、標題格式或特殊排版。
- 依照下方【報告架構】組織內容。

模式二「對話問答」：用戶針對特定個股或主題追問時使用。
- 字數控制在 150-300 字。
- 直接回答問題，語氣像面對面諮詢。
- 回答必須引用客戶實際持股資料，不講空泛的通論。
- 如果問題涉及客戶未持有的股票，明確告知該股不在目前投資組合中，但仍可提供一般性觀點。

【報告架構（模式一，依此順序）】
第一段「持股全景」：逐檔掃描每檔持股，用一句話點出該股目前的產業地位與在組合中扮演的角色（成長引擎、穩定收益、投機部位等）。不需要展開分析，點到為止。

第二段「產業輪動觀點」：基於當前全球與台灣的景氣週期位置，判斷客戶持股的產業配置是否順應趨勢。指出哪些產業目前處於景氣上升段、哪些正在進入衰退或調整段，以及客戶的配置與週期的契合度。

第三段「風險情境模擬」：選擇 1-2 個對客戶投資組合衝擊最大的合理情境（例如：半導體需求下滑、台幣急升、內需消費萎縮、全球升息等），具體說明該情境下哪些持股會受衝擊、預估影響佔總市值多少比例，以及組合中哪些持股可能起到避險效果。

第四段「行動建議」：基於以上分析和顧客持股的額度和今天市場上該股票的額度，閱讀並搜尋客戶買入該股的價格，以及今天的市場價格後，給出 2-3 項具體可執行的調整建議。每項建議必須包含：做什麼（加碼/減碼/新增/替換）、做多少、理由是什麼。

【溝通風格】
- 語氣沉穩自信，像私人銀行顧問面對面諮詢。
- 適度使用生活化比喻讓複雜概念易懂。
- 客觀中立，禁止「強烈看好」「必定上漲」「絕對安全」等聳動或過度樂觀詞彙。
- 所有判斷必須附帶理由。
- 對話問答模式中，先直接回答結論，再給理由，不繞圈子。

【重要限制】
- 產業輪動觀點基於訓練資料中的歷史規律與公開資訊，非即時市場數據，必要時提醒客戶核實最新狀況。
- 禁止給出具體買入價格或目標價。
- 你的分析是參考建議，非投資指令。
- 佔比與市值數字直接引用用戶提供的計算結果，不自行重新計算。`;

const FOLLOW_UP_SUGGESTION_PROMPT = `請根據目前這位客戶的投資組合分析、持股內容與既有對話內容，產生 5 個最值得追問的後續問題。

限制：
- 每題都要和客戶目前持有的台股組合直接相關。
- 優先圍繞持股比重最高的 1-2 檔股票、主要產業暴露與接下來一季的觀察重點。
- 問題要像客戶下一步會點選追問的內容，聚焦在風險、加減碼、產業輪動、持股角色、觀察重點。
- 每題使用繁體中文，長度控制在 12-30 個字。
- 不要重複，不要過於籠統，不要問 API、模型、系統功能。

回覆格式：
- 只輸出一個 JSON 陣列
- 陣列中必須剛好有 5 個字串
- 不得包含 markdown、前言、解釋或其他文字`;

const DEFAULT_SUGGESTED_QUESTIONS = [
  '目前這個組合最大的風險集中在哪裡？',
  '如果要分散風險，最先該調整哪一檔？',
  '接下來一季這個組合最該觀察什麼訊號？',
  '以目前配置來看，現在適合加碼還是先觀望？',
  '如果景氣轉弱，哪些持股會最先受影響？',
] as const;

type ProviderKind = 'minimax' | 'openai' | 'gemini' | 'other';

function detectProvider(baseUrl: string): ProviderKind {
  if (baseUrl.includes('minimax.io')) return 'minimax';
  if (baseUrl.includes('api.openai.com')) return 'openai';
  if (baseUrl.includes('generativelanguage.googleapis.com')) return 'gemini';
  return 'other';
}

function buildChatBody(
  credentials: Credentials,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: { temperature?: number; maxTokens?: number; jsonObject?: boolean },
): Record<string, unknown> {
  const provider = detectProvider(credentials.baseUrl);
  const body: Record<string, unknown> = {
    model: credentials.modelName,
    messages,
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.maxTokens ?? 900,
  };

  if (options?.jsonObject && (provider === 'openai' || provider === 'gemini')) {
    body.response_format = { type: 'json_object' };
  }

  return body;
}

function sanitizeAiText(content: string): string {
  return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

function parseSuggestedQuestions(content: string): string[] {
  const cleaned = sanitizeAiText(content);
  if (!cleaned) return [];

  const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .filter((value): value is string => typeof value === 'string')
          .map(value => value.trim().replace(/^[\-\d\.\)\s]+/, ''))
          .filter(Boolean);
        if (normalized.length >= 5) {
          return normalized.slice(0, 5);
        }
      }
    } catch {
      // Fall through to line-based parsing.
    }
  }

  const lines = cleaned
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => line.replace(/^[\-\d\.\)\s]+/, '').trim())
    .filter(Boolean);

  if (lines.length >= 5) {
    return lines.slice(0, 5);
  }

  return [];
}

function scoreEntryPriority(entry: PortfolioEntry): number {
  if (entry.currentPrice != null) {
    return entry.currentPrice * entry.quantity;
  }
  return entry.quantity;
}

function buildSuggestionContext(entries: PortfolioEntry[]): string {
  const activeEntries = entries
    .filter(entry => entry.quantity > 0)
    .sort((a, b) => scoreEntryPriority(b) - scoreEntryPriority(a))
    .slice(0, 5);
  const industries = Array.from(new Set(activeEntries.map(entry => getIndustry(entry.symbol))));
  const topHoldings = activeEntries
    .map(entry => `${entry.name}（${entry.symbol}）`)
    .join('、');

  return `目前持股重點：
- 主要持股：${topHoldings || '無持股資料'}
- 主要產業：${industries.join('、') || '無明確產業資料'}

請根據以上持股重點與既有對話內容，提出 5 個更聚焦、更值得延伸追問的問題。`;
}

function dedupeQuestions(questions: string[]): string[] {
  return Array.from(
    new Set(
      questions
        .map(question => question.trim())
        .filter(Boolean),
    ),
  );
}

function formatSignedCurrency(value: number): string {
  const rounded = Math.round(value);
  return `${rounded >= 0 ? '+' : ''}${rounded.toLocaleString()}`;
}

function formatSignedPercent(value: number): string {
  const rounded = value.toFixed(1);
  return `${value >= 0 ? '+' : ''}${rounded}%`;
}

// Build the data-rich user message (data + request in one message)
export function buildDetailedAnalysisPrompt(entries: PortfolioEntry[]): string {
  const active = entries.filter((e) => e.quantity > 0).slice(0, MAX_STOCKS);
  const priced = active.filter((e) => e.currentPrice != null);
  const totalValue = priced.reduce((sum, e) => sum + e.currentPrice! * e.quantity, 0);
  const costAware = active.filter((e) => e.entryPrice != null);
  const totalCost = costAware.reduce((sum, e) => sum + e.entryPrice! * e.quantity, 0);
  const unrealizedPnL = active.reduce((sum, e) => {
    if (e.currentPrice == null || e.entryPrice == null) return sum;
    return sum + (e.currentPrice - e.entryPrice) * e.quantity;
  }, 0);
  const unrealizedReturnPct = totalCost > 0 ? (unrealizedPnL / totalCost) * 100 : null;

  const stockLines = active.map((e) => {
    const industry = getIndustry(e.symbol);
    const entryPriceText = e.entryPrice != null ? `${e.entryPrice} 元` : '無資料';
    if (e.currentPrice == null) {
      return `- ${e.name}（${e.symbol}）｜產業：${industry}｜持股 ${e.quantity.toLocaleString()} 股｜買入價 ${entryPriceText}｜現價 無資料`;
    }
    const mv = e.currentPrice * e.quantity;
    const w = totalValue > 0 ? ((mv / totalValue) * 100).toFixed(1) : '0.0';
    const costBasis = e.entryPrice != null ? e.entryPrice * e.quantity : null;
    const pnl = costBasis != null ? mv - costBasis : null;
    const pnlText = pnl != null ? `｜未實現損益 ${formatSignedCurrency(pnl)} 元` : '';
    const returnText =
      pnl != null && costBasis && costBasis > 0
        ? `｜報酬率 ${formatSignedPercent((pnl / costBasis) * 100)}`
        : '';
    return `- ${e.name}（${e.symbol}）｜產業：${industry}｜持股 ${e.quantity.toLocaleString()} 股｜買入價 ${entryPriceText}｜現價 ${e.currentPrice} 元｜市值 ${Math.round(mv).toLocaleString()} 元｜佔比 ${w}%${pnlText}${returnText}`;
  });

  const industryMap: Record<string, number> = {};
  for (const e of priced) {
    const ind = getIndustry(e.symbol);
    industryMap[ind] = (industryMap[ind] ?? 0) + e.currentPrice! * e.quantity;
  }
  const industryLines = Object.entries(industryMap)
    .sort((a, b) => b[1] - a[1])
    .map(([ind, mv]) => `- ${ind}：${totalValue > 0 ? ((mv / totalValue) * 100).toFixed(1) : '0.0'}%`);

  const sortedByMv = [...priced].sort(
    (a, b) => b.currentPrice! * b.quantity - a.currentPrice! * a.quantity,
  );
  const maxStock = sortedByMv[0];
  const maxStockW =
    maxStock && totalValue > 0
      ? ((maxStock.currentPrice! * maxStock.quantity / totalValue) * 100).toFixed(1)
      : '—';
  const maxInd = Object.entries(industryMap).sort((a, b) => b[1] - a[1])[0];
  const maxIndW = maxInd && totalValue > 0 ? ((maxInd[1] / totalValue) * 100).toFixed(1) : '—';
  const top3W =
    totalValue > 0
      ? ((sortedByMv.slice(0, 3).reduce((s, e) => s + e.currentPrice! * e.quantity, 0) / totalValue) * 100).toFixed(1)
      : '—';

  return `【客戶的投資組合資料】
總市值：${Math.round(totalValue).toLocaleString()} 元
持股明細：
${stockLines.length > 0 ? stockLines.join('\n') : '- 無持股資料'}

產業分布：
${industryLines.length > 0 ? industryLines.join('\n') : '- 無可計算資料'}

關鍵指標：
- 最大單一持股佔比：${maxStockW}%${maxStock ? `（${maxStock.name}）` : ''}
- 最大單一產業佔比：${maxIndW}%${maxInd ? `（${maxInd[0]}）` : ''}
- 前三大持股合計佔比：${top3W}%
- 持股檔數：${active.length}
- 已提供買入價的持股數：${costAware.length}
- 總成本：${totalCost > 0 ? `${Math.round(totalCost).toLocaleString()} 元` : '無資料'}
- 未實現損益：${totalCost > 0 ? `${formatSignedCurrency(unrealizedPnL)} 元` : '無資料'}
- 整體未實現報酬率：${unrealizedReturnPct != null ? formatSignedPercent(unrealizedReturnPct) : '無資料'}

請為我的台灣股票投資組合提供完整的深度分析報告，包含持股全景、產業輪動觀點、風險情境模擬與行動建議。`;
}

// Alias kept for test compatibility
export function buildPortfolioPrompt(entries: PortfolioEntry[]): string {
  return buildDetailedAnalysisPrompt(entries);
}

export function extractHealthScore(response: string): number {
  const match = response.match(/SCORE[：:]\s*(\d{1,3})\s*\/\s*100/i);
  if (!match) return 50;
  return Math.min(100, Math.max(0, parseInt(match[1], 10)));
}

export function fallbackSuggestedQuestions(entries: PortfolioEntry[] = []): string[] {
  const activeEntries = entries
    .filter(entry => entry.quantity > 0)
    .sort((a, b) => scoreEntryPriority(b) - scoreEntryPriority(a));
  const topHolding = activeEntries[0];
  const secondHolding = activeEntries[1];
  const mainIndustry = topHolding ? getIndustry(topHolding.symbol) : null;

  const focusedDefaults = dedupeQuestions([
    topHolding ? `${topHolding.name} 現在適合續抱還是分批調節？` : '',
    topHolding && secondHolding
      ? `${topHolding.name} 和 ${secondHolding.name} 的比重需要調整嗎？`
      : '如果想降低單一持股風險，下一步該怎麼分散？',
    mainIndustry ? `${mainIndustry} 族群轉弱時，組合會先受什麼影響？` : '',
    '接下來一季最該觀察哪些關鍵訊號？',
    '目前這個組合最值得優先調整的是哪一檔？',
    ...DEFAULT_SUGGESTED_QUESTIONS,
  ]);

  return focusedDefaults.slice(0, 5);
}

export async function callPortfolioMiniMax(
  entries: PortfolioEntry[],
  credentials: Credentials,
): Promise<PortfolioAnalysis | null> {
  const url = `${credentials.baseUrl.replace(/\/$/, '')}/chat/completions`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);

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
          { role: 'user', content: buildDetailedAnalysisPrompt(entries) },
        ],
        temperature: 0.3,
        max_tokens: 900,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = await res.json();
    let content: string = (data.choices?.[0]?.message?.content ?? '') as string;
    content = sanitizeAiText(content);
    if (!content) throw new Error('回應內容為空');

    const score = extractHealthScore(content);
    const paragraph = content.replace(/SCORE[：:]\s*\d{1,3}\s*\/\s*100[^\n]*/gi, '').trim();

    return { score, paragraph };
  } finally {
    clearTimeout(timer);
  }
}

export async function callPortfolioFollowUp(
  chatHistory: ChatMessage[],
  question: string,
  credentials: Credentials,
): Promise<string | null> {
  const url = `${credentials.baseUrl.replace(/\/$/, '')}/chat/completions`;

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
          ...chatHistory,
          { role: 'user', content: question },
        ],
        temperature: 0.4,
        max_tokens: 600,
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = await res.json();
    let content: string = (data.choices?.[0]?.message?.content ?? '') as string;
    content = sanitizeAiText(content);
    return content || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function generatePortfolioSuggestedQuestions(
  chatHistory: ChatMessage[],
  entries: PortfolioEntry[],
  credentials: Credentials,
): Promise<SuggestedQuestionsResult> {
  const url = `${credentials.baseUrl.replace(/\/$/, '')}/chat/completions`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        buildChatBody(
          credentials,
          [
            { role: 'system', content: PORTFOLIO_SYSTEM_PROMPT },
            ...chatHistory,
            { role: 'user', content: `${buildSuggestionContext(entries)}\n\n${FOLLOW_UP_SUGGESTION_PROMPT}` },
          ],
          { temperature: 0.4, maxTokens: 400, jsonObject: true },
        ),
      ),
      signal: controller.signal,
    });

    if (!res.ok) {
      return { questions: fallbackSuggestedQuestions(entries), source: 'fallback' };
    }

    const data = await res.json();
    const content: string = (data.choices?.[0]?.message?.content ?? '') as string;
    const parsed = parseSuggestedQuestions(content);
    if (parsed.length === 5) {
      return { questions: parsed, source: 'ai' };
    }
    return { questions: fallbackSuggestedQuestions(entries), source: 'fallback' };
  } catch {
    return { questions: fallbackSuggestedQuestions(entries), source: 'fallback' };
  } finally {
    clearTimeout(timer);
  }
}

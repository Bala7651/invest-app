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

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

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

function buildSystemPromptWithData(entries: PortfolioEntry[]): string {
  const active = entries.filter((e) => e.quantity > 0).slice(0, MAX_STOCKS);
  const priced = active.filter((e) => e.currentPrice != null);
  const totalValue = priced.reduce((sum, e) => sum + e.currentPrice! * e.quantity, 0);

  const stockLines = active.map((e) => {
    const industry = getIndustry(e.symbol);
    if (e.currentPrice == null) {
      return `- ${e.name}（${e.symbol}）｜產業：${industry}｜持股 ${e.quantity.toLocaleString()} 股｜現價 無資料`;
    }
    const mv = e.currentPrice * e.quantity;
    const w = totalValue > 0 ? ((mv / totalValue) * 100).toFixed(1) : '0.0';
    return `- ${e.name}（${e.symbol}）｜產業：${industry}｜持股 ${e.quantity.toLocaleString()} 股｜現價 ${e.currentPrice} 元｜市值 ${Math.round(mv).toLocaleString()} 元｜佔比 ${w}%`;
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

  const sortedInd = Object.entries(industryMap).sort((a, b) => b[1] - a[1]);
  const maxInd = sortedInd[0];
  const maxIndW =
    maxInd && totalValue > 0 ? ((maxInd[1] / totalValue) * 100).toFixed(1) : '—';

  const top3Mv = sortedByMv
    .slice(0, 3)
    .reduce((sum, e) => sum + e.currentPrice! * e.quantity, 0);
  const top3W = totalValue > 0 ? ((top3Mv / totalValue) * 100).toFixed(1) : '—';

  return `你是一位資深台灣股市投資組合顧問，隸屬聲譽卓著的金融機構，專為高淨值客戶提供深度投資分析與長期理財規劃。你的專長涵蓋個股基本面評估、產業輪動週期判斷、風險情境模擬，以及持股策略建議。

【客戶的投資組合資料】
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

第四段「行動建議」：基於以上分析，給出 2-3 項具體可執行的調整建議。每項建議必須包含：做什麼（加碼/減碼/新增/替換）、對象是誰、理由是什麼。

【溝通風格】
- 語氣沉穩自信，像私人銀行顧問面對面諮詢。
- 適度使用生活化比喻讓複雜概念易懂。
- 客觀中立，禁止「強烈看好」「必定上漲」「絕對安全」等聳動或過度樂觀詞彙。
- 所有判斷必須附帶理由。
- 對話問答模式中，先直接回答結論，再給理由，不繞圈子。

【重要限制】
- 你不具備即時行情查詢能力，所有數據以上方提供的為準。
- 產業輪動觀點基於訓練資料中的歷史規律與公開資訊，非即時市場數據，必要時提醒客戶核實最新狀況。
- 禁止給出具體買入價格或目標價。
- 你的分析是參考建議，非投資指令。
- 佔比與市值數字直接引用上方提供的計算結果，不自行重新計算。`;
}

export function buildDetailedAnalysisPrompt(): string {
  return `請為我的台灣股票投資組合提供完整的深度分析報告，包含持股全景、產業輪動觀點、風險情境模擬與行動建議。`;
}

// Alias kept for test compatibility — tests check that data appears in the returned string
export function buildPortfolioPrompt(entries: PortfolioEntry[]): string {
  return buildSystemPromptWithData(entries);
}

export function extractHealthScore(response: string): number {
  const match = response.match(/SCORE[：:]\s*(\d{1,3})\s*\/\s*100/i);
  if (!match) return 50;
  return Math.min(100, Math.max(0, parseInt(match[1], 10)));
}

export async function callPortfolioMiniMax(
  entries: PortfolioEntry[],
  credentials: Credentials,
): Promise<PortfolioAnalysis | null> {
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
          { role: 'system', content: buildSystemPromptWithData(entries) },
          { role: 'user', content: buildDetailedAnalysisPrompt() },
        ],
        temperature: 0.3,
        max_tokens: 1600,
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = await res.json();
    let content: string = (data.choices?.[0]?.message?.content ?? '') as string;
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

export async function callPortfolioFollowUp(
  entries: PortfolioEntry[],
  chatHistory: ChatMessage[],
  question: string,
  credentials: Credentials,
): Promise<string | null> {
  const url = `${credentials.baseUrl.replace(/\/$/, '')}/chat/completions`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

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
          { role: 'system', content: buildSystemPromptWithData(entries) },
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
    content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    return content || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

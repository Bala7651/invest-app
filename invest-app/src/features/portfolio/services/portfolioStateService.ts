import { db } from '../../../db/client';
import { portfolio_ai_state } from '../../../db/schema';
import { ChatMessage, PortfolioAnalysis } from './portfolioAiService';

const PORTFOLIO_STATE_ROW_ID = 1;

interface PortfolioAiStateRow {
  id: number;
  last_analysis: string | null;
  chat_history: string;
}

export interface PortfolioAiSnapshot {
  lastAnalysis: PortfolioAnalysis | null;
  chatHistory: ChatMessage[];
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    (candidate.role === 'user' || candidate.role === 'assistant') &&
    typeof candidate.content === 'string'
  );
}

function isPortfolioAnalysis(value: unknown): value is PortfolioAnalysis {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.score === 'number' &&
    typeof candidate.paragraph === 'string'
  );
}

export async function loadPortfolioAiState(): Promise<PortfolioAiSnapshot> {
  const rows = (await db.select().from(portfolio_ai_state)) as PortfolioAiStateRow[];
  const row = rows[0];
  if (!row) {
    return { lastAnalysis: null, chatHistory: [] };
  }

  let lastAnalysis: PortfolioAnalysis | null = null;
  let chatHistory: ChatMessage[] = [];

  if (row.last_analysis) {
    try {
      const parsed = JSON.parse(row.last_analysis);
      if (isPortfolioAnalysis(parsed)) {
        lastAnalysis = parsed;
      }
    } catch {
      // Ignore malformed persisted analysis text.
    }
  }

  try {
    const parsed = JSON.parse(row.chat_history);
    if (Array.isArray(parsed)) {
      chatHistory = parsed.filter(isChatMessage);
    }
  } catch {
    chatHistory = [];
  }

  return { lastAnalysis, chatHistory };
}

export async function savePortfolioAiState(
  lastAnalysis: PortfolioAnalysis | null,
  chatHistory: ChatMessage[],
): Promise<void> {
  await db.delete(portfolio_ai_state);
  await db.insert(portfolio_ai_state).values({
    id: PORTFOLIO_STATE_ROW_ID,
    last_analysis: lastAnalysis ? JSON.stringify(lastAnalysis) : null,
    chat_history: JSON.stringify(chatHistory),
    updated_at: new Date(),
  });
}

import { eq } from 'drizzle-orm';
import { db } from '../../../db/client';
import { analysis_cache } from '../../../db/schema';
import { AnalysisResult } from '../types';

interface AnalysisCacheRow {
  symbol: string;
  content: string;
  cached_at: Date | null;
}

export interface PersistedAnalysisEntry {
  symbol: string;
  result: AnalysisResult;
  cachedAt: number;
}

function isAnalysisResult(value: unknown): value is AnalysisResult {
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

export async function loadPersistedAnalyses(): Promise<PersistedAnalysisEntry[]> {
  const rows = (await db.select().from(analysis_cache)) as AnalysisCacheRow[];
  const parsed: PersistedAnalysisEntry[] = [];

  for (const row of rows) {
    try {
      const result = JSON.parse(row.content);
      if (!isAnalysisResult(result)) continue;
      parsed.push({
        symbol: row.symbol,
        result,
        cachedAt: row.cached_at?.getTime() ?? 0,
      });
    } catch {
      // Ignore malformed cached rows so one bad entry does not break hydration.
    }
  }

  return parsed;
}

export async function upsertPersistedAnalysis(
  symbol: string,
  result: AnalysisResult,
  cachedAt: number,
): Promise<void> {
  await db.delete(analysis_cache).where(eq(analysis_cache.symbol, symbol));
  await db.insert(analysis_cache).values({
    symbol,
    content: JSON.stringify(result),
    cached_at: new Date(cachedAt),
    updated_at: new Date(),
  });
}

export async function clearPersistedAnalyses(): Promise<void> {
  await db.delete(analysis_cache);
}

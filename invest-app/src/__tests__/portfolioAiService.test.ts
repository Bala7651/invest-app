import {
  buildPortfolioPrompt,
  callPortfolioMiniMax,
  generatePortfolioSuggestedQuestions,
  fallbackSuggestedQuestions,
} from '../features/portfolio/services/portfolioAiService';

// extractHealthScore is not exported separately; tested via callPortfolioMiniMax or
// we test it indirectly. We test it via a helper pattern from the service.
// Since the plan says extractHealthScore should be testable, we import it too.
// It's a pure function so we export it.
import { extractHealthScore } from '../features/portfolio/services/portfolioAiService';

beforeEach(() => {
  global.fetch = jest.fn();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.resetAllMocks();
});

const makeEntry = (overrides = {}) => ({
  symbol: '2330',
  name: '台積電',
  quantity: 5000,
  currentPrice: 850,
  entryPrice: 810,
  ...overrides,
});

describe('buildPortfolioPrompt', () => {
  it('includes stock name and quantity for each entry', () => {
    const entries = [makeEntry({ name: '台積電', quantity: 5000 })];
    const prompt = buildPortfolioPrompt(entries);

    expect(prompt).toContain('台積電');
    expect(prompt).toContain('5,000');
  });

  it('includes entry price and unrealized P/L context when available', () => {
    const prompt = buildPortfolioPrompt([makeEntry({ entryPrice: 810, currentPrice: 850 })]);

    expect(prompt).toContain('買入價 810 元');
    expect(prompt).toContain('未實現損益');
  });

  it('caps at 15 stocks when given 16+ entries', () => {
    const entries = Array.from({ length: 16 }, (_, i) =>
      makeEntry({ symbol: `${2300 + i}`, name: `股票${i}`, quantity: 1000 + i })
    );
    const prompt = buildPortfolioPrompt(entries);

    // Should contain stock 0..14 but not stock 15
    expect(prompt).toContain('股票14');
    expect(prompt).not.toContain('股票15');
  });

  it('includes all entries when given exactly 15', () => {
    const entries = Array.from({ length: 15 }, (_, i) =>
      makeEntry({ symbol: `${2300 + i}`, name: `股票${i}`, quantity: 1000 })
    );
    const prompt = buildPortfolioPrompt(entries);

    expect(prompt).toContain('股票14');
  });

  it('builds an English portfolio prompt when language is set to en', () => {
    const prompt = buildPortfolioPrompt([makeEntry({ name: 'TSMC' })], 'en');
    expect(prompt).toContain('Client portfolio data');
    expect(prompt).toContain('Total market value');
    expect(prompt).toContain('TSMC');
  });
});

describe('extractHealthScore', () => {
  it('parses SCORE:72/100 and returns 72', () => {
    const result = extractHealthScore('整體投資組合評估良好。SCORE:72/100');
    expect(result).toBe(72);
  });

  it('returns 50 for malformed response (no SCORE tag)', () => {
    const result = extractHealthScore('這是一段沒有評分的回應文字');
    expect(result).toBe(50);
  });

  it('returns 50 for empty string', () => {
    const result = extractHealthScore('');
    expect(result).toBe(50);
  });

  it('handles SCORE with space after colon', () => {
    const result = extractHealthScore('分析完成。SCORE: 68/100');
    expect(result).toBe(68);
  });

  it('handles full-width colon SCORE：72/100', () => {
    const result = extractHealthScore('SCORE：72/100');
    expect(result).toBe(72);
  });

  it('handles SCORE:100/100 edge case', () => {
    const result = extractHealthScore('表現優異 SCORE:100/100');
    expect(result).toBe(100);
  });

  it('handles SCORE:0/100 edge case', () => {
    const result = extractHealthScore('風險極高 SCORE:0/100');
    expect(result).toBe(0);
  });
});

describe('callPortfolioMiniMax', () => {
  const credentials = {
    apiKey: 'test-key',
    modelName: 'MiniMax-M2.5',
    baseUrl: 'https://api.minimax.io/v1',
  };

  it('returns score and paragraph on successful response', async () => {
    const responseText = '您的投資組合分析如下，需注意集中風險。SCORE:65/100';
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: responseText } }],
      }),
    });

    const entries = [makeEntry()];
    const result = await callPortfolioMiniMax(entries, credentials);

    expect(result).not.toBeNull();
    expect(result!.score).toBe(65);
    expect(result!.paragraph).toContain('投資組合');
  });

  it('throws on HTTP error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    await expect(callPortfolioMiniMax([makeEntry()], credentials)).rejects.toThrow('HTTP 500');
  });

  it('throws on network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failed'));

    await expect(callPortfolioMiniMax([makeEntry()], credentials)).rejects.toThrow('Network failed');
  });
});

describe('generatePortfolioSuggestedQuestions', () => {
  const credentials = {
    apiKey: 'test-key',
    modelName: 'MiniMax-M2.5',
    baseUrl: 'https://api.minimax.io/v1',
  };

  it('parses a JSON array of five suggested questions', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify([
              '目前組合最大的風險集中在哪裡？',
              '如果要分散風險，最先該調整哪一檔？',
              '接下來一季最該觀察什麼訊號？',
              '以目前配置來看，現在適合加碼還是觀望？',
              '若景氣轉弱，哪些持股會最先受影響？',
            ]),
          },
        }],
      }),
    });

    const result = await generatePortfolioSuggestedQuestions(
      [{ role: 'assistant', content: '既有分析' }],
      [makeEntry()],
      credentials,
    );

    expect(result.questions).toHaveLength(5);
    expect(result.questions[0]).toContain('風險');
    expect(result.source).toBe('ai');
  });

  it('falls back to default suggestions when the model response is malformed', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '這裡沒有合法格式' } }],
      }),
    });

    const result = await generatePortfolioSuggestedQuestions(
      [{ role: 'assistant', content: '既有分析' }],
      [makeEntry({ name: '台積電' })],
      credentials,
    );

    expect(result.questions).toEqual(fallbackSuggestedQuestions([makeEntry({ name: '台積電' })]));
    expect(result.source).toBe('fallback');
  });
});

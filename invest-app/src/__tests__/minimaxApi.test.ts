import { buildPrompt, parseAnalysisResponse, callMiniMax } from '../features/analysis/services/minimaxApi';
import { AnalysisResult } from '../features/analysis/types';

const mockQuote = {
  name: 'Taiwan Semiconductor',
  price: 850.5,
  change: 12.5,
  changePct: 1.49,
  prevClose: 838.0,
  volume: 25000000,
};

const mockResult: AnalysisResult = {
  technicalScore: 72,
  technicalSummary: '今日形成長紅K棒，收盤價站上MA5，量能溫和配合，多方動能漸增。',
  trendPosition: '多方主導',
  volumeSignal: '溫和放量',
  riskLevel: '中等風險',
  riskExplanation: '振幅約2%，屬正常波動，均線偏離幅度不大。',
  outlook: '短期支撐在MA5附近，若量能持續則有機會測試前高。',
  overallScore: 70,
};

describe('buildPrompt', () => {
  it('contains the symbol', () => {
    const prompt = buildPrompt('2330', mockQuote);
    expect(prompt).toContain('2330');
  });

  it('contains the stock name', () => {
    const prompt = buildPrompt('2330', mockQuote);
    expect(prompt).toContain('Taiwan Semiconductor');
  });

  it('injects exact price value', () => {
    const prompt = buildPrompt('2330', mockQuote);
    expect(prompt).toContain('850.5');
  });

  it('injects exact change value', () => {
    const prompt = buildPrompt('2330', mockQuote);
    expect(prompt).toContain('12.50');
  });

  it('injects exact prevClose value', () => {
    const prompt = buildPrompt('2330', mockQuote);
    expect(prompt).toContain('838');
  });

  it('injects exact volume value', () => {
    const prompt = buildPrompt('2330', mockQuote);
    expect(prompt).toContain('25000000');
  });

  it('handles null price gracefully', () => {
    const quoteWithNullPrice = { ...mockQuote, price: null };
    const prompt = buildPrompt('2330', quoteWithNullPrice);
    expect(prompt).toContain('無資料');
  });
});

describe('parseAnalysisResponse', () => {
  it('extracts JSON from markdown code block', () => {
    const content = `\`\`\`json\n${JSON.stringify(mockResult)}\n\`\`\``;
    const result = parseAnalysisResponse(content);
    expect(result.technicalScore).toBe(72);
    expect(result.trendPosition).toBe('多方主導');
    expect(result.overallScore).toBe(70);
  });

  it('extracts JSON from code block without language tag', () => {
    const content = `\`\`\`\n${JSON.stringify(mockResult)}\n\`\`\``;
    const result = parseAnalysisResponse(content);
    expect(result.overallScore).toBe(70);
  });

  it('extracts bare JSON object without code block', () => {
    const content = JSON.stringify(mockResult);
    const result = parseAnalysisResponse(content);
    expect(result.technicalScore).toBe(72);
  });

  it('throws Error with "No JSON found" when content has no JSON', () => {
    expect(() => parseAnalysisResponse('This is just text with no JSON at all.')).toThrow('No JSON found');
  });

  it('throws on malformed JSON inside code block', () => {
    const content = '```json\n{ "technicalScore": 72, "broken": \n```';
    expect(() => parseAnalysisResponse(content)).toThrow();
  });
});

describe('callMiniMax', () => {
  const credentials = {
    apiKey: 'test-api-key',
    modelName: 'MiniMax-M2.5',
    baseUrl: 'https://api.minimax.io/v1',
  };

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('sends POST to the correct URL', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(mockResult) } }],
      }),
    });

    await callMiniMax('2330', mockQuote, credentials);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.minimax.io/v1/chat/completions',
      expect.any(Object)
    );
  });

  it('sends POST to the correct URL with trailing slash in baseUrl', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(mockResult) } }],
      }),
    });

    await callMiniMax('2330', mockQuote, { ...credentials, baseUrl: 'https://api.minimax.io/v1/' });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.minimax.io/v1/chat/completions',
      expect.any(Object)
    );
  });

  it('sends Bearer auth header', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(mockResult) } }],
      }),
    });

    await callMiniMax('2330', mockQuote, credentials);

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers['Authorization']).toBe('Bearer test-api-key');
  });

  it('sends correct body with model, messages, temperature, max_tokens', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(mockResult) } }],
      }),
    });

    await callMiniMax('2330', mockQuote, credentials);

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.model).toBe('MiniMax-M2.5');
    expect(body.temperature).toBe(0.2);
    expect(body.max_tokens).toBe(900);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1].role).toBe('user');
  });

  it('returns parsed AnalysisResult on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: `\`\`\`json\n${JSON.stringify(mockResult)}\n\`\`\`` } }],
      }),
    });

    const result = await callMiniMax('2330', mockQuote, credentials);
    expect(result.trendPosition).toBe('多方主導');
  });

  it('repairs a non-JSON first response with a second formatting call', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '台積電今日收紅，量能溫和放大，短線偏多。' } }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockResult) } }],
        }),
      });

    const result = await callMiniMax('2330', mockQuote, credentials);

    expect(result.overallScore).toBe(70);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('falls back to a local structured analysis when the model never returns JSON', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '今天股價偏強，但模型沒有照要求輸出。' } }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '還是沒有 JSON' } }],
        }),
      });

    const result = await callMiniMax('2330', mockQuote, credentials);

    expect(typeof result.technicalSummary).toBe('string');
    expect(result.technicalSummary.length).toBeGreaterThan(0);
    expect(result.volumeSignal).toBe('無資料');
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });

  it('adds json_object response_format for OpenAI-compatible structured output providers', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(mockResult) } }],
      }),
    });

    await callMiniMax('2330', mockQuote, {
      apiKey: 'test-api-key',
      modelName: 'gpt-4.1-mini',
      baseUrl: 'https://api.openai.com/v1',
    });

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('throws on non-ok HTTP response with status code in message', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    await expect(callMiniMax('2330', mockQuote, credentials)).rejects.toThrow('401');
  });

  it('throws on non-ok HTTP response with 500 status code in message', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(callMiniMax('2330', mockQuote, credentials)).rejects.toThrow('500');
  });
});

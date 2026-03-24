import { useAnalysisStore } from '../features/analysis/store/analysisStore';
import { callMiniMax } from '../features/analysis/services/minimaxApi';
import { AnalysisResult } from '../features/analysis/types';
import { useQuoteStore } from '../features/market/quoteStore';

jest.mock('../features/analysis/services/minimaxApi');
jest.mock('../features/summary/services/summaryService', () => ({
  fetchLatestQuoteForSummary: jest.fn().mockResolvedValue(null),
  mergeQuoteData: jest.fn((liveQuote, dailyQuote) => dailyQuote ?? liveQuote ?? null),
}));
jest.mock('../features/market/quoteStore', () => ({
  useQuoteStore: {
    getState: jest.fn(() => ({
      forceRefresh: jest.fn().mockResolvedValue(undefined),
      quotes: {},
    })),
  },
}));
jest.mock('../features/market/marketHours', () => ({
  isMarketOpen: jest.fn(() => true),
}));

const mockCallMiniMax = callMiniMax as jest.MockedFunction<typeof callMiniMax>;

const mockQuote = {
  name: 'Taiwan Semiconductor',
  price: 850.5,
  change: 12.5,
  changePct: 1.49,
  prevClose: 838.0,
  volume: 25000000,
};

const mockCredentials = {
  apiKey: 'test-api-key',
  modelName: 'MiniMax-M2.5',
  baseUrl: 'https://api.minimax.io/v1',
};

const mockResult: AnalysisResult = {
  technicalScore: 72,
  technicalSummary: '今日形成長紅K棒，收盤價站上MA5，量能溫和配合。',
  trendPosition: '多方主導',
  volumeSignal: '溫和放量',
  riskLevel: '中等風險',
  riskExplanation: '振幅約2%，屬正常波動。',
  outlook: '短期支撐在MA5附近，若量能持續則有機會測試前高。',
  overallScore: 70,
};

beforeEach(() => {
  useAnalysisStore.getState().clearAnalysis();
  jest.resetAllMocks();
  (useQuoteStore.getState as jest.Mock).mockReturnValue({
    forceRefresh: jest.fn().mockResolvedValue(undefined),
    quotes: {},
  });
});

describe('fetchAnalysis', () => {
  it('stores result in cache on successful fetch', async () => {
    mockCallMiniMax.mockResolvedValueOnce(mockResult);

    await useAnalysisStore.getState().fetchAnalysis('2330', mockQuote, mockCredentials);

    const state = useAnalysisStore.getState();
    expect(state.cache['2330']).toEqual(mockResult);
  });

  it('sets cachedAt timestamp on successful fetch', async () => {
    const before = Date.now();
    mockCallMiniMax.mockResolvedValueOnce(mockResult);

    await useAnalysisStore.getState().fetchAnalysis('2330', mockQuote, mockCredentials);

    const state = useAnalysisStore.getState();
    expect(state.cachedAt['2330']).toBeGreaterThanOrEqual(before);
    expect(state.cachedAt['2330']).toBeLessThanOrEqual(Date.now());
  });

  it('sets loading to false after successful fetch', async () => {
    mockCallMiniMax.mockResolvedValueOnce(mockResult);

    await useAnalysisStore.getState().fetchAnalysis('2330', mockQuote, mockCredentials);

    expect(useAnalysisStore.getState().loading['2330']).toBe(false);
  });

  it('sets errors to null on successful fetch', async () => {
    mockCallMiniMax.mockResolvedValueOnce(mockResult);

    await useAnalysisStore.getState().fetchAnalysis('2330', mockQuote, mockCredentials);

    expect(useAnalysisStore.getState().errors['2330']).toBeNull();
  });

  it('skips API call when cache is fresh (within 30-minute TTL)', async () => {
    mockCallMiniMax.mockResolvedValue(mockResult);

    await useAnalysisStore.getState().fetchAnalysis('2330', mockQuote, mockCredentials);
    await useAnalysisStore.getState().fetchAnalysis('2330', mockQuote, mockCredentials);

    expect(mockCallMiniMax).toHaveBeenCalledTimes(1);
  });

  it('re-fetches when cache is expired (>= 30 minutes old)', async () => {
    mockCallMiniMax.mockResolvedValue(mockResult);

    await useAnalysisStore.getState().fetchAnalysis('2330', mockQuote, mockCredentials);

    // Manually expire the cache by setting cachedAt to past time
    const TTL_MS = 30 * 60 * 1000;
    useAnalysisStore.setState(s => ({
      cachedAt: { ...s.cachedAt, '2330': Date.now() - TTL_MS - 1 },
    }));

    await useAnalysisStore.getState().fetchAnalysis('2330', mockQuote, mockCredentials);

    expect(mockCallMiniMax).toHaveBeenCalledTimes(2);
  });

  it('sets error message in errors[symbol] when fetch fails', async () => {
    mockCallMiniMax.mockRejectedValueOnce(new Error('Network error'));

    await useAnalysisStore.getState().fetchAnalysis('2330', mockQuote, mockCredentials);

    expect(useAnalysisStore.getState().errors['2330']).toContain('Network error');
  });

  it('sets loading to false after fetch failure', async () => {
    mockCallMiniMax.mockRejectedValueOnce(new Error('Network error'));

    await useAnalysisStore.getState().fetchAnalysis('2330', mockQuote, mockCredentials);

    expect(useAnalysisStore.getState().loading['2330']).toBe(false);
  });

  it('does not throw on fetch failure', async () => {
    mockCallMiniMax.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      useAnalysisStore.getState().fetchAnalysis('2330', mockQuote, mockCredentials)
    ).resolves.not.toThrow();
  });

  it('tracks loading per symbol independently', async () => {
    let resolveFirst!: (value: AnalysisResult) => void;
    const firstFetch = new Promise<AnalysisResult>(resolve => { resolveFirst = resolve; });
    mockCallMiniMax.mockReturnValueOnce(firstFetch);
    mockCallMiniMax.mockResolvedValueOnce(mockResult);

    const p1 = useAnalysisStore.getState().fetchAnalysis('2330', mockQuote, mockCredentials);
    const p2 = useAnalysisStore.getState().fetchAnalysis('2454', mockQuote, mockCredentials);

    await p2;
    expect(useAnalysisStore.getState().loading['2454']).toBe(false);
    expect(useAnalysisStore.getState().cache['2454']).toEqual(mockResult);

    resolveFirst(mockResult);
    await p1;
    expect(useAnalysisStore.getState().loading['2330']).toBe(false);
  });
});

describe('clearAnalysis', () => {
  it('clears all cache state', async () => {
    mockCallMiniMax.mockResolvedValueOnce(mockResult);
    await useAnalysisStore.getState().fetchAnalysis('2330', mockQuote, mockCredentials);

    useAnalysisStore.getState().clearAnalysis();

    const state = useAnalysisStore.getState();
    expect(state.cache).toEqual({});
    expect(state.cachedAt).toEqual({});
    expect(state.loading).toEqual({});
    expect(state.errors).toEqual({});
  });
});

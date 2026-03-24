import { useHoldingsStore } from '../features/portfolio/store/holdingsStore';

jest.mock('../features/portfolio/services/holdingsService', () => ({
  upsertHolding: jest.fn(),
  getAllHoldings: jest.fn(),
  deleteHolding: jest.fn(),
}));
jest.mock('../features/portfolio/services/portfolioStateService', () => ({
  loadPortfolioAiState: jest.fn().mockResolvedValue({
    lastAnalysis: null,
    chatHistory: [],
    suggestedQuestions: [],
    suggestedQuestionsSource: 'ai',
  }),
  savePortfolioAiState: jest.fn().mockResolvedValue(undefined),
}));

import * as holdingsService from '../features/portfolio/services/holdingsService';
import * as portfolioStateService from '../features/portfolio/services/portfolioStateService';

const mockGetAllHoldings = holdingsService.getAllHoldings as jest.MockedFunction<typeof holdingsService.getAllHoldings>;
const mockUpsertHolding = holdingsService.upsertHolding as jest.MockedFunction<typeof holdingsService.upsertHolding>;
const mockDeleteHolding = holdingsService.deleteHolding as jest.MockedFunction<typeof holdingsService.deleteHolding>;
const mockLoadPortfolioAiState = portfolioStateService.loadPortfolioAiState as jest.MockedFunction<typeof portfolioStateService.loadPortfolioAiState>;
const mockSavePortfolioAiState = portfolioStateService.savePortfolioAiState as jest.MockedFunction<typeof portfolioStateService.savePortfolioAiState>;

const makeHolding = (overrides = {}) => ({
  id: 1,
  symbol: '2330',
  name: '台積電',
  quantity: 5000,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

beforeEach(() => {
  useHoldingsStore.setState({
    holdings: {},
    loading: false,
    error: null,
    lastAnalysis: null,
    chatHistory: [],
    suggestedQuestions: [],
    suggestedQuestionsSource: 'ai',
  });
  jest.clearAllMocks();
  mockUpsertHolding.mockResolvedValue(undefined);
  mockDeleteHolding.mockResolvedValue(undefined);
  mockLoadPortfolioAiState.mockResolvedValue({
    lastAnalysis: null,
    chatHistory: [],
    suggestedQuestions: [],
    suggestedQuestionsSource: 'ai',
  });
  mockSavePortfolioAiState.mockResolvedValue(undefined);
});

describe('loadHoldings', () => {
  it('calls getAllHoldings and populates store.holdings map keyed by symbol', async () => {
    const rows = [
      makeHolding({ symbol: '2330', name: '台積電', quantity: 5000 }),
      makeHolding({ id: 2, symbol: '2317', name: '鴻海', quantity: 2000 }),
    ];
    mockGetAllHoldings.mockResolvedValue(rows);

    await useHoldingsStore.getState().loadHoldings();

    expect(mockGetAllHoldings).toHaveBeenCalledTimes(1);
    const { holdings } = useHoldingsStore.getState();
    expect(holdings['2330']).toEqual(rows[0]);
    expect(holdings['2317']).toEqual(rows[1]);
  });

  it('sets empty holdings map when db is empty', async () => {
    mockGetAllHoldings.mockResolvedValue([]);

    await useHoldingsStore.getState().loadHoldings();

    expect(useHoldingsStore.getState().holdings).toEqual({});
  });

  it('hydrates persisted portfolio analysis and chat history', async () => {
    mockGetAllHoldings.mockResolvedValue([]);
    mockLoadPortfolioAiState.mockResolvedValueOnce({
      lastAnalysis: { score: 75, paragraph: '既有投資組合分析' },
      chatHistory: [{ role: 'assistant', content: '既有追問內容' }],
      suggestedQuestions: ['下一題一', '下一題二', '下一題三', '下一題四', '下一題五'],
      suggestedQuestionsSource: 'fallback',
    });

    await useHoldingsStore.getState().loadHoldings();

    expect(useHoldingsStore.getState().lastAnalysis).toEqual({
      score: 75,
      paragraph: '既有投資組合分析',
    });
    expect(useHoldingsStore.getState().chatHistory).toEqual([
      { role: 'assistant', content: '既有追問內容' },
    ]);
    expect(useHoldingsStore.getState().suggestedQuestions).toEqual([
      '下一題一',
      '下一題二',
      '下一題三',
      '下一題四',
      '下一題五',
    ]);
    expect(useHoldingsStore.getState().suggestedQuestionsSource).toBe('fallback');
  });
});

describe('setQuantity', () => {
  it('calls upsertHolding and updates store.holdings[symbol].quantity when quantity > 0', async () => {
    const row = makeHolding({ symbol: '2330', name: '台積電', quantity: 8000 });
    mockGetAllHoldings.mockResolvedValue([row]);

    await useHoldingsStore.getState().setQuantity('2330', '台積電', 8000);

    expect(mockUpsertHolding).toHaveBeenCalledWith('2330', '台積電', 8000);
    const { holdings } = useHoldingsStore.getState();
    expect(holdings['2330'].quantity).toBe(8000);
  });

  it('calls deleteHolding and removes symbol from store.holdings when quantity === 0', async () => {
    useHoldingsStore.setState({
      holdings: { '2330': makeHolding() },
    });

    await useHoldingsStore.getState().setQuantity('2330', '台積電', 0);

    expect(mockDeleteHolding).toHaveBeenCalledWith('2330');
    const { holdings } = useHoldingsStore.getState();
    expect(holdings['2330']).toBeUndefined();
  });
});

describe('portfolio AI persistence', () => {
  it('persists lastAnalysis changes', () => {
    useHoldingsStore.getState().setLastAnalysis({ score: 88, paragraph: '新的分析結果' });

    expect(mockSavePortfolioAiState).toHaveBeenCalledWith(
      { score: 88, paragraph: '新的分析結果' },
      [],
      [],
      'ai',
    );
  });

  it('persists chat history when appending a message', () => {
    useHoldingsStore.setState({
      lastAnalysis: { score: 88, paragraph: '新的分析結果' },
      chatHistory: [{ role: 'assistant', content: '先前分析' }],
      suggestedQuestions: ['題目一', '題目二'],
    });

    useHoldingsStore.getState().appendChatMessage({ role: 'user', content: '後續問題' });

    expect(mockSavePortfolioAiState).toHaveBeenCalledWith(
      { score: 88, paragraph: '新的分析結果' },
      [
        { role: 'assistant', content: '先前分析' },
        { role: 'user', content: '後續問題' },
      ],
      ['題目一', '題目二'],
      'ai',
    );
  });

  it('persists suggested questions when they change', () => {
    useHoldingsStore.setState({
      lastAnalysis: { score: 88, paragraph: '新的分析結果' },
      chatHistory: [{ role: 'assistant', content: '先前分析' }],
      suggestedQuestions: [],
    });

    useHoldingsStore.getState().setSuggestedQuestions([
      '追問一',
      '追問二',
      '追問三',
      '追問四',
      '追問五',
      '追問六',
    ]);

    expect(mockSavePortfolioAiState).toHaveBeenCalledWith(
      { score: 88, paragraph: '新的分析結果' },
      [{ role: 'assistant', content: '先前分析' }],
      ['追問一', '追問二', '追問三', '追問四', '追問五'],
      'ai',
    );
    expect(useHoldingsStore.getState().suggestedQuestions).toEqual([
      '追問一',
      '追問二',
      '追問三',
      '追問四',
      '追問五',
    ]);
  });

  it('persists suggested question source when fallback defaults are used', () => {
    useHoldingsStore.getState().setSuggestedQuestions(
      ['題目一', '題目二', '題目三', '題目四', '題目五'],
      'fallback',
    );

    expect(mockSavePortfolioAiState).toHaveBeenCalledWith(
      null,
      [],
      ['題目一', '題目二', '題目三', '題目四', '題目五'],
      'fallback',
    );
    expect(useHoldingsStore.getState().suggestedQuestionsSource).toBe('fallback');
  });
});

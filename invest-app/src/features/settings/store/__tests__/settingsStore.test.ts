import { useSettingsStore } from '../settingsStore';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockSetItemAsync = SecureStore.setItemAsync as jest.Mock;
const mockGetItemAsync = SecureStore.getItemAsync as jest.Mock;
const mockDeleteItemAsync = SecureStore.deleteItemAsync as jest.Mock;

function getLocalDateKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItemAsync.mockResolvedValue(null);
  mockSetItemAsync.mockResolvedValue(undefined);
  mockDeleteItemAsync.mockResolvedValue(undefined);
  useSettingsStore.setState({
    apiKey: '',
    minimaxApiKey: '',
    openAiApiKey: '',
    geminiApiKey: '',
    modelName: 'MiniMax-M2.5',
    baseUrl: 'https://api.minimax.io/v1',
    providerName: 'MiniMax',
    marketDataProvider: 'twse_yahoo',
    alphaVantageApiKey: '',
    alphaVantageEnabled: false,
    alphaVantageDailyRemaining: 25,
    alphaVantageLastResetDate: getLocalDateKey(),
    aiNotificationsEnabled: true,
  });
});

describe('settingsStore initial state', () => {
  it('has empty apiKey by default', () => {
    expect(useSettingsStore.getState().apiKey).toBe('');
  });

  it('has MiniMax-M2.5 as default modelName', () => {
    expect(useSettingsStore.getState().modelName).toBe('MiniMax-M2.5');
  });

  it('has correct default baseUrl', () => {
    expect(useSettingsStore.getState().baseUrl).toBe('https://api.minimax.io/v1');
  });

  it('has twse_yahoo as default marketDataProvider', () => {
    expect(useSettingsStore.getState().marketDataProvider).toBe('twse_yahoo');
  });
});

describe('saveApiKey', () => {
  it('calls SecureStore.setItemAsync with the current provider key slot', async () => {
    await useSettingsStore.getState().saveApiKey('test-key-1234');
    expect(mockSetItemAsync).toHaveBeenCalledWith('minimax_api_key', 'test-key-1234');
  });

  it('updates state.apiKey after save', async () => {
    await useSettingsStore.getState().saveApiKey('test-key-1234');
    expect(useSettingsStore.getState().apiKey).toBe('test-key-1234');
    expect(useSettingsStore.getState().minimaxApiKey).toBe('test-key-1234');
  });

  it('stores OpenAI key separately when the selected provider is OpenAI', async () => {
    useSettingsStore.setState({
      providerName: 'OpenAI',
      modelName: 'gpt-4.1',
      baseUrl: 'https://api.openai.com/v1',
    });

    await useSettingsStore.getState().saveApiKey('openai-key');

    expect(mockSetItemAsync).toHaveBeenCalledWith('openai_api_key', 'openai-key');
    expect(useSettingsStore.getState().openAiApiKey).toBe('openai-key');
    expect(useSettingsStore.getState().apiKey).toBe('openai-key');
  });
});

describe('loadFromSecureStore', () => {
  it('populates state.apiKey from the active provider key', async () => {
    mockGetItemAsync.mockImplementation((key: string) => {
      if (key === 'minimax_api_key') return Promise.resolve('loaded-key');
      return Promise.resolve(null);
    });
    await useSettingsStore.getState().loadFromSecureStore();
    expect(useSettingsStore.getState().apiKey).toBe('loaded-key');
  });

  it('sets apiKey to empty string when SecureStore returns null', async () => {
    mockGetItemAsync.mockResolvedValue(null);
    await useSettingsStore.getState().loadFromSecureStore();
    expect(useSettingsStore.getState().apiKey).toBe('');
  });

  it('calls SecureStore.getItemAsync for minimax_api_key', async () => {
    await useSettingsStore.getState().loadFromSecureStore();
    expect(mockGetItemAsync).toHaveBeenCalledWith('minimax_api_key');
    expect(mockGetItemAsync).toHaveBeenCalledWith('openai_api_key');
    expect(mockGetItemAsync).toHaveBeenCalledWith('gemini_api_key');
  });

  it('keeps a compatible stored model and normalizes baseUrl to the selected provider', async () => {
    mockGetItemAsync.mockImplementation((key: string) => {
      if (key === 'minimax_model_name') return Promise.resolve('MiniMax-Text-01');
      if (key === 'minimax_base_url') return Promise.resolve('https://custom.url/v1');
      return Promise.resolve(null);
    });
    await useSettingsStore.getState().loadFromSecureStore();
    expect(useSettingsStore.getState().modelName).toBe('MiniMax-Text-01');
    expect(useSettingsStore.getState().baseUrl).toBe('https://api.minimax.io/v1');
  });

  it('normalizes modelName/baseUrl to the provider defaults when SecureStore returns null', async () => {
    mockGetItemAsync.mockResolvedValue(null);
    await useSettingsStore.getState().loadFromSecureStore();
    expect(useSettingsStore.getState().modelName).toBe('MiniMax-M2.7');
    expect(useSettingsStore.getState().baseUrl).toBe('https://api.minimax.io/v1');
  });

  it('loads marketDataProvider and alphaVantageApiKey from SecureStore', async () => {
    mockGetItemAsync.mockImplementation((key: string) => {
      if (key === 'market_data_provider') return Promise.resolve('alpha_vantage');
      if (key === 'alpha_vantage_api_key') return Promise.resolve('alpha-key');
      if (key === 'alpha_vantage_enabled') return Promise.resolve('true');
      if (key === 'alpha_vantage_daily_remaining') return Promise.resolve('17');
      if (key === 'alpha_vantage_last_reset') return Promise.resolve(getLocalDateKey());
      return Promise.resolve(null);
    });
    await useSettingsStore.getState().loadFromSecureStore();
    expect(useSettingsStore.getState().marketDataProvider).toBe('alpha_vantage');
    expect(useSettingsStore.getState().alphaVantageApiKey).toBe('alpha-key');
    expect(useSettingsStore.getState().alphaVantageEnabled).toBe(true);
    expect(useSettingsStore.getState().alphaVantageDailyRemaining).toBe(17);
  });

  it('hydrates the OpenAI key into the active apiKey when providerName is OpenAI', async () => {
    mockGetItemAsync.mockImplementation((key: string) => {
      if (key === 'ai_provider_name') return Promise.resolve('OpenAI');
      if (key === 'openai_api_key') return Promise.resolve('openai-key');
      if (key === 'minimax_model_name') return Promise.resolve('gpt-4.1');
      return Promise.resolve(null);
    });

    await useSettingsStore.getState().loadFromSecureStore();

    expect(useSettingsStore.getState().providerName).toBe('OpenAI');
    expect(useSettingsStore.getState().apiKey).toBe('openai-key');
    expect(useSettingsStore.getState().baseUrl).toBe('https://api.openai.com/v1');
  });

  it('migrates the legacy shared key into the selected provider slot', async () => {
    mockGetItemAsync.mockImplementation((key: string) => {
      if (key === 'ai_provider_name') return Promise.resolve('Google Gemini');
      if (key === 'minimax_api_key') return Promise.resolve('legacy-shared-key');
      return Promise.resolve(null);
    });

    await useSettingsStore.getState().loadFromSecureStore();

    expect(mockSetItemAsync).toHaveBeenCalledWith('gemini_api_key', 'legacy-shared-key');
    expect(useSettingsStore.getState().geminiApiKey).toBe('legacy-shared-key');
    expect(useSettingsStore.getState().apiKey).toBe('legacy-shared-key');
  });
});

describe('deleteApiKey', () => {
  it('calls SecureStore.deleteItemAsync with the active provider key', async () => {
    await useSettingsStore.getState().deleteApiKey();
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('minimax_api_key');
  });

  it('clears state.apiKey to empty string', async () => {
    useSettingsStore.setState({ apiKey: 'existing-key', minimaxApiKey: 'existing-key' });
    await useSettingsStore.getState().deleteApiKey();
    expect(useSettingsStore.getState().apiKey).toBe('');
    expect(useSettingsStore.getState().minimaxApiKey).toBe('');
  });
});

describe('setModelName', () => {
  it('updates state.modelName', async () => {
    await useSettingsStore.getState().setModelName('custom-model');
    expect(useSettingsStore.getState().modelName).toBe('custom-model');
  });

  it('persists modelName to SecureStore', async () => {
    await useSettingsStore.getState().setModelName('custom-model');
    expect(mockSetItemAsync).toHaveBeenCalledWith('minimax_model_name', 'custom-model');
  });
});

describe('setBaseUrl', () => {
  it('updates state.baseUrl', async () => {
    await useSettingsStore.getState().setBaseUrl('https://custom.url/v1');
    expect(useSettingsStore.getState().baseUrl).toBe('https://custom.url/v1');
  });

  it('persists baseUrl to SecureStore', async () => {
    await useSettingsStore.getState().setBaseUrl('https://custom.url/v1');
    expect(mockSetItemAsync).toHaveBeenCalledWith('minimax_base_url', 'https://custom.url/v1');
  });
});

describe('provider-specific AI config helpers', () => {
  it('setProvider switches the active apiKey to the selected provider key', async () => {
    useSettingsStore.setState({
      minimaxApiKey: 'mini-key',
      openAiApiKey: 'open-key',
      geminiApiKey: 'gem-key',
    });

    await useSettingsStore.getState().setProvider('OpenAI', 'https://api.openai.com/v1', 'gpt-4.1');

    expect(useSettingsStore.getState().providerName).toBe('OpenAI');
    expect(useSettingsStore.getState().apiKey).toBe('open-key');
  });

  it('getActiveAiCredentials returns the currently selected provider bundle', async () => {
    useSettingsStore.setState({
      providerName: 'Google Gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      modelName: 'gemini-2.5-flash',
      apiKey: 'gem-key',
      geminiApiKey: 'gem-key',
    });

    expect(useSettingsStore.getState().getActiveAiCredentials()).toEqual({
      providerName: 'Google Gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      modelName: 'gemini-2.5-flash',
      apiKey: 'gem-key',
    });
    expect(useSettingsStore.getState().hasActiveAiKey()).toBe(true);
  });
});

describe('saveAlphaVantageApiKey', () => {
  it('persists Alpha Vantage api key to SecureStore', async () => {
    await useSettingsStore.getState().saveAlphaVantageApiKey('alpha-key');
    expect(mockSetItemAsync).toHaveBeenCalledWith('alpha_vantage_api_key', 'alpha-key');
  });

  it('updates state.alphaVantageApiKey after save', async () => {
    await useSettingsStore.getState().saveAlphaVantageApiKey('alpha-key');
    expect(useSettingsStore.getState().alphaVantageApiKey).toBe('alpha-key');
  });

  it('resets daily remaining back to 25 when the key is changed', async () => {
    useSettingsStore.setState({ alphaVantageDailyRemaining: 3 });
    await useSettingsStore.getState().saveAlphaVantageApiKey('alpha-key');
    expect(useSettingsStore.getState().alphaVantageDailyRemaining).toBe(25);
  });
});

describe('setMarketDataProvider', () => {
  it('persists the selected market data provider', async () => {
    await useSettingsStore.getState().setMarketDataProvider('alpha_vantage');
    expect(mockSetItemAsync).toHaveBeenCalledWith('market_data_provider', 'alpha_vantage');
  });

  it('updates state.marketDataProvider', async () => {
    await useSettingsStore.getState().setMarketDataProvider('alpha_vantage');
    expect(useSettingsStore.getState().marketDataProvider).toBe('alpha_vantage');
  });
});

describe('Alpha Vantage quota helpers', () => {
  it('setAlphaVantageEnabled persists and updates state', async () => {
    await useSettingsStore.getState().setAlphaVantageEnabled(true);
    expect(mockSetItemAsync).toHaveBeenCalledWith('alpha_vantage_enabled', 'true');
    expect(useSettingsStore.getState().alphaVantageEnabled).toBe(true);
  });

  it('recordAlphaVantageRequest decreases daily remaining by 1', async () => {
    useSettingsStore.setState({ alphaVantageDailyRemaining: 25 });
    const remaining = await useSettingsStore.getState().recordAlphaVantageRequest();
    expect(remaining).toBe(24);
    expect(useSettingsStore.getState().alphaVantageDailyRemaining).toBe(24);
  });

  it('markAlphaVantageLimitReached forces remaining down to 0', async () => {
    useSettingsStore.setState({ alphaVantageDailyRemaining: 12 });
    await useSettingsStore.getState().markAlphaVantageLimitReached();
    expect(useSettingsStore.getState().alphaVantageDailyRemaining).toBe(0);
  });

  it('ensureAlphaVantageQuotaCurrent resets an old quota date', async () => {
    useSettingsStore.setState({
      alphaVantageDailyRemaining: 4,
      alphaVantageLastResetDate: '2000-01-01',
    });
    await useSettingsStore.getState().ensureAlphaVantageQuotaCurrent();
    expect(useSettingsStore.getState().alphaVantageDailyRemaining).toBe(25);
    expect(useSettingsStore.getState().alphaVantageLastResetDate).toBe(getLocalDateKey());
  });
});

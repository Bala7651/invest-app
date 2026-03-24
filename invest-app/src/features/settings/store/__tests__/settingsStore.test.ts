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

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItemAsync.mockResolvedValue(null);
  mockSetItemAsync.mockResolvedValue(undefined);
  mockDeleteItemAsync.mockResolvedValue(undefined);
  useSettingsStore.setState({
    apiKey: '',
    modelName: 'MiniMax-M2.5',
    baseUrl: 'https://api.minimax.io/v1',
    providerName: 'MiniMax',
    marketDataProvider: 'twse_yahoo',
    alphaVantageApiKey: '',
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
  it('calls SecureStore.setItemAsync with correct key and value', async () => {
    await useSettingsStore.getState().saveApiKey('test-key-1234');
    expect(mockSetItemAsync).toHaveBeenCalledWith('minimax_api_key', 'test-key-1234');
  });

  it('updates state.apiKey after save', async () => {
    await useSettingsStore.getState().saveApiKey('test-key-1234');
    expect(useSettingsStore.getState().apiKey).toBe('test-key-1234');
  });
});

describe('loadFromSecureStore', () => {
  it('populates state.apiKey from SecureStore', async () => {
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
  });

  it('loads modelName and baseUrl from SecureStore', async () => {
    mockGetItemAsync.mockImplementation((key: string) => {
      if (key === 'minimax_model_name') return Promise.resolve('custom-model');
      if (key === 'minimax_base_url') return Promise.resolve('https://custom.url/v1');
      return Promise.resolve(null);
    });
    await useSettingsStore.getState().loadFromSecureStore();
    expect(useSettingsStore.getState().modelName).toBe('custom-model');
    expect(useSettingsStore.getState().baseUrl).toBe('https://custom.url/v1');
  });

  it('keeps defaults for modelName/baseUrl when SecureStore returns null', async () => {
    mockGetItemAsync.mockResolvedValue(null);
    await useSettingsStore.getState().loadFromSecureStore();
    expect(useSettingsStore.getState().modelName).toBe('MiniMax-M2.5');
    expect(useSettingsStore.getState().baseUrl).toBe('https://api.minimax.io/v1');
  });

  it('loads marketDataProvider and alphaVantageApiKey from SecureStore', async () => {
    mockGetItemAsync.mockImplementation((key: string) => {
      if (key === 'market_data_provider') return Promise.resolve('alpha_vantage');
      if (key === 'alpha_vantage_api_key') return Promise.resolve('alpha-key');
      return Promise.resolve(null);
    });
    await useSettingsStore.getState().loadFromSecureStore();
    expect(useSettingsStore.getState().marketDataProvider).toBe('alpha_vantage');
    expect(useSettingsStore.getState().alphaVantageApiKey).toBe('alpha-key');
  });
});

describe('deleteApiKey', () => {
  it('calls SecureStore.deleteItemAsync with correct key', async () => {
    await useSettingsStore.getState().deleteApiKey();
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('minimax_api_key');
  });

  it('clears state.apiKey to empty string', async () => {
    useSettingsStore.setState({ apiKey: 'existing-key' });
    await useSettingsStore.getState().deleteApiKey();
    expect(useSettingsStore.getState().apiKey).toBe('');
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

describe('saveAlphaVantageApiKey', () => {
  it('persists Alpha Vantage api key to SecureStore', async () => {
    await useSettingsStore.getState().saveAlphaVantageApiKey('alpha-key');
    expect(mockSetItemAsync).toHaveBeenCalledWith('alpha_vantage_api_key', 'alpha-key');
  });

  it('updates state.alphaVantageApiKey after save', async () => {
    await useSettingsStore.getState().saveAlphaVantageApiKey('alpha-key');
    expect(useSettingsStore.getState().alphaVantageApiKey).toBe('alpha-key');
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

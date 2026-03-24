import { create } from 'zustand';
import { setItemAsync, getItemAsync, deleteItemAsync } from 'expo-secure-store';

export type GlowLevel = 'subtle' | 'medium' | 'heavy';
export type MarketDataProvider = 'twse_yahoo' | 'alpha_vantage';

const API_KEY_STORE_KEY = 'minimax_api_key';
const MODEL_NAME_STORE_KEY = 'minimax_model_name';
const BASE_URL_STORE_KEY = 'minimax_base_url';
const PROVIDER_NAME_STORE_KEY = 'ai_provider_name';
const AI_NOTIFICATIONS_STORE_KEY = 'ai_notifications_enabled';
const MARKET_DATA_PROVIDER_STORE_KEY = 'market_data_provider';
const ALPHA_VANTAGE_API_KEY_STORE_KEY = 'alpha_vantage_api_key';

interface SettingsState {
  glowLevel: GlowLevel;
  apiKey: string;
  modelName: string;
  baseUrl: string;
  providerName: string;
  aiNotificationsEnabled: boolean;
  marketDataProvider: MarketDataProvider;
  alphaVantageApiKey: string;
  setGlowLevel: (level: GlowLevel) => void;
  saveApiKey: (key: string) => Promise<void>;
  saveAlphaVantageApiKey: (key: string) => Promise<void>;
  loadFromSecureStore: () => Promise<void>;
  deleteApiKey: () => Promise<void>;
  deleteAlphaVantageApiKey: () => Promise<void>;
  setModelName: (name: string) => Promise<void>;
  setBaseUrl: (url: string) => Promise<void>;
  setProvider: (name: string, baseUrl: string, defaultModel: string) => Promise<void>;
  setAiNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setMarketDataProvider: (provider: MarketDataProvider) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  glowLevel: 'subtle',
  apiKey: '',
  modelName: 'MiniMax-M2.5',
  baseUrl: 'https://api.minimax.io/v1',
  providerName: 'MiniMax',
  aiNotificationsEnabled: true,
  marketDataProvider: 'twse_yahoo',
  alphaVantageApiKey: '',

  setGlowLevel: (level) => set({ glowLevel: level }),

  saveApiKey: async (key) => {
    await setItemAsync(API_KEY_STORE_KEY, key);
    set({ apiKey: key });
  },

  saveAlphaVantageApiKey: async (key) => {
    await setItemAsync(ALPHA_VANTAGE_API_KEY_STORE_KEY, key);
    set({ alphaVantageApiKey: key });
  },

  loadFromSecureStore: async () => {
    const [
      apiKey,
      modelName,
      baseUrl,
      providerName,
      aiNotif,
      marketDataProvider,
      alphaVantageApiKey,
    ] = await Promise.all([
      getItemAsync(API_KEY_STORE_KEY),
      getItemAsync(MODEL_NAME_STORE_KEY),
      getItemAsync(BASE_URL_STORE_KEY),
      getItemAsync(PROVIDER_NAME_STORE_KEY),
      getItemAsync(AI_NOTIFICATIONS_STORE_KEY),
      getItemAsync(MARKET_DATA_PROVIDER_STORE_KEY),
      getItemAsync(ALPHA_VANTAGE_API_KEY_STORE_KEY),
    ]);
    set({
      apiKey: apiKey ?? '',
      modelName: modelName ?? 'MiniMax-M2.5',
      baseUrl: baseUrl ?? 'https://api.minimax.io/v1',
      providerName: providerName ?? 'MiniMax',
      aiNotificationsEnabled: aiNotif !== 'false',
      marketDataProvider: marketDataProvider === 'alpha_vantage' ? 'alpha_vantage' : 'twse_yahoo',
      alphaVantageApiKey: alphaVantageApiKey ?? '',
    });
  },

  deleteApiKey: async () => {
    await deleteItemAsync(API_KEY_STORE_KEY);
    set({ apiKey: '' });
  },

  deleteAlphaVantageApiKey: async () => {
    await deleteItemAsync(ALPHA_VANTAGE_API_KEY_STORE_KEY);
    set({ alphaVantageApiKey: '' });
  },

  setModelName: async (name) => {
    await setItemAsync(MODEL_NAME_STORE_KEY, name);
    set({ modelName: name });
  },

  setBaseUrl: async (url) => {
    await setItemAsync(BASE_URL_STORE_KEY, url);
    set({ baseUrl: url });
  },

  setProvider: async (name, baseUrl, defaultModel) => {
    await Promise.all([
      setItemAsync(PROVIDER_NAME_STORE_KEY, name),
      setItemAsync(BASE_URL_STORE_KEY, baseUrl),
      setItemAsync(MODEL_NAME_STORE_KEY, defaultModel),
    ]);
    set({ providerName: name, baseUrl, modelName: defaultModel });
  },

  setAiNotificationsEnabled: async (enabled) => {
    await setItemAsync(AI_NOTIFICATIONS_STORE_KEY, String(enabled));
    set({ aiNotificationsEnabled: enabled });
  },

  setMarketDataProvider: async (provider) => {
    await setItemAsync(MARKET_DATA_PROVIDER_STORE_KEY, provider);
    set({ marketDataProvider: provider });
  },
}));

import { create } from 'zustand';
import { setItemAsync, getItemAsync, deleteItemAsync } from 'expo-secure-store';
import { AI_PROVIDERS } from '../constants/providers';

export type GlowLevel = 'subtle' | 'medium' | 'heavy';
export type MarketDataProvider = 'twse_yahoo' | 'alpha_vantage' | 'fugle';
export type AIProviderName = 'MiniMax' | 'OpenAI' | 'Google Gemini';
export const ALPHA_VANTAGE_DAILY_QUOTA = 25;

const MINIMAX_API_KEY_STORE_KEY = 'minimax_api_key';
const OPENAI_API_KEY_STORE_KEY = 'openai_api_key';
const GEMINI_API_KEY_STORE_KEY = 'gemini_api_key';
const MODEL_NAME_STORE_KEY = 'minimax_model_name';
const BASE_URL_STORE_KEY = 'minimax_base_url';
const PROVIDER_NAME_STORE_KEY = 'ai_provider_name';
const AI_NOTIFICATIONS_STORE_KEY = 'ai_notifications_enabled';
const MARKET_DATA_PROVIDER_STORE_KEY = 'market_data_provider';
const ALPHA_VANTAGE_API_KEY_STORE_KEY = 'alpha_vantage_api_key';
const ALPHA_VANTAGE_ENABLED_STORE_KEY = 'alpha_vantage_enabled';
const ALPHA_VANTAGE_DAILY_REMAINING_STORE_KEY = 'alpha_vantage_daily_remaining';
const ALPHA_VANTAGE_LAST_RESET_STORE_KEY = 'alpha_vantage_last_reset';
const FUGLE_API_KEY_STORE_KEY = 'fugle_api_key';
const FUGLE_ENABLED_STORE_KEY = 'fugle_enabled';
const MARKET_DATA_RECOMMENDATION_SEEN_STORE_KEY = 'market_data_recommendation_seen';

function getLocalDateKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resolveProvider(name?: string): typeof AI_PROVIDERS[number] {
  return AI_PROVIDERS.find(provider => provider.name === name) ?? AI_PROVIDERS[0];
}

function getApiKeyStoreKey(providerName: AIProviderName): string {
  switch (providerName) {
    case 'OpenAI':
      return OPENAI_API_KEY_STORE_KEY;
    case 'Google Gemini':
      return GEMINI_API_KEY_STORE_KEY;
    case 'MiniMax':
    default:
      return MINIMAX_API_KEY_STORE_KEY;
  }
}

function getProviderApiKey(
  providerName: AIProviderName,
  apiKeys: { minimaxApiKey: string; openAiApiKey: string; geminiApiKey: string }
): string {
  switch (providerName) {
    case 'OpenAI':
      return apiKeys.openAiApiKey;
    case 'Google Gemini':
      return apiKeys.geminiApiKey;
    case 'MiniMax':
    default:
      return apiKeys.minimaxApiKey;
  }
}

function setProviderApiKeyInState(
  providerName: AIProviderName,
  key: string,
  state: Pick<SettingsState, 'minimaxApiKey' | 'openAiApiKey' | 'geminiApiKey'>
) {
  switch (providerName) {
    case 'OpenAI':
      return {
        minimaxApiKey: state.minimaxApiKey,
        openAiApiKey: key,
        geminiApiKey: state.geminiApiKey,
      };
    case 'Google Gemini':
      return {
        minimaxApiKey: state.minimaxApiKey,
        openAiApiKey: state.openAiApiKey,
        geminiApiKey: key,
      };
    case 'MiniMax':
    default:
      return {
        minimaxApiKey: key,
        openAiApiKey: state.openAiApiKey,
        geminiApiKey: state.geminiApiKey,
      };
  }
}

interface SettingsState {
  glowLevel: GlowLevel;
  apiKey: string;
  minimaxApiKey: string;
  openAiApiKey: string;
  geminiApiKey: string;
  modelName: string;
  baseUrl: string;
  providerName: AIProviderName;
  aiNotificationsEnabled: boolean;
  marketDataProvider: MarketDataProvider;
  alphaVantageApiKey: string;
  alphaVantageEnabled: boolean;
  alphaVantageDailyRemaining: number;
  alphaVantageLastResetDate: string;
  fugleApiKey: string;
  fugleEnabled: boolean;
  marketDataRecommendationSeen: boolean;
  setGlowLevel: (level: GlowLevel) => void;
  saveApiKey: (key: string) => Promise<void>;
  getApiKeyForProvider: (providerName: AIProviderName) => string;
  getActiveAiCredentials: () => { apiKey: string; modelName: string; baseUrl: string; providerName: AIProviderName };
  hasActiveAiKey: () => boolean;
  saveAlphaVantageApiKey: (key: string) => Promise<void>;
  saveFugleApiKey: (key: string) => Promise<void>;
  loadFromSecureStore: () => Promise<void>;
  deleteApiKey: () => Promise<void>;
  deleteAlphaVantageApiKey: () => Promise<void>;
  deleteFugleApiKey: () => Promise<void>;
  setModelName: (name: string) => Promise<void>;
  setBaseUrl: (url: string) => Promise<void>;
  setProvider: (name: string, baseUrl: string, defaultModel: string) => Promise<void>;
  setAiNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setMarketDataProvider: (provider: MarketDataProvider) => Promise<void>;
  setAlphaVantageEnabled: (enabled: boolean) => Promise<void>;
  setFugleEnabled: (enabled: boolean) => Promise<void>;
  markMarketDataRecommendationSeen: () => Promise<void>;
  ensureAlphaVantageQuotaCurrent: () => Promise<void>;
  resetAlphaVantageQuota: () => Promise<void>;
  recordAlphaVantageRequest: () => Promise<number>;
  markAlphaVantageLimitReached: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  glowLevel: 'subtle',
  apiKey: '',
  minimaxApiKey: '',
  openAiApiKey: '',
  geminiApiKey: '',
  modelName: 'MiniMax-M2.5',
  baseUrl: 'https://api.minimax.io/v1',
  providerName: 'MiniMax',
  aiNotificationsEnabled: true,
  marketDataProvider: 'twse_yahoo',
  alphaVantageApiKey: '',
  alphaVantageEnabled: false,
  alphaVantageDailyRemaining: ALPHA_VANTAGE_DAILY_QUOTA,
  alphaVantageLastResetDate: getLocalDateKey(),
  fugleApiKey: '',
  fugleEnabled: false,
  marketDataRecommendationSeen: false,

  setGlowLevel: (level) => set({ glowLevel: level }),

  getApiKeyForProvider: (providerName) => {
    const { minimaxApiKey, openAiApiKey, geminiApiKey } = get();
    return getProviderApiKey(providerName, { minimaxApiKey, openAiApiKey, geminiApiKey });
  },

  getActiveAiCredentials: () => {
    const { apiKey, modelName, baseUrl, providerName } = get();
    return { apiKey, modelName, baseUrl, providerName };
  },

  hasActiveAiKey: () => get().apiKey.trim().length > 0,

  saveApiKey: async (key) => {
    const providerName = get().providerName;
    await setItemAsync(getApiKeyStoreKey(providerName), key);
    set((state) => ({
      ...setProviderApiKeyInState(providerName, key, state),
      apiKey: key,
    }));
  },

  saveAlphaVantageApiKey: async (key) => {
    const today = getLocalDateKey();
    await Promise.all([
      setItemAsync(ALPHA_VANTAGE_API_KEY_STORE_KEY, key),
      setItemAsync(ALPHA_VANTAGE_DAILY_REMAINING_STORE_KEY, String(ALPHA_VANTAGE_DAILY_QUOTA)),
      setItemAsync(ALPHA_VANTAGE_LAST_RESET_STORE_KEY, today),
    ]);
    set({
      alphaVantageApiKey: key,
      alphaVantageDailyRemaining: ALPHA_VANTAGE_DAILY_QUOTA,
      alphaVantageLastResetDate: today,
    });
  },

  saveFugleApiKey: async (key) => {
    await setItemAsync(FUGLE_API_KEY_STORE_KEY, key);
    set({ fugleApiKey: key });
  },

  loadFromSecureStore: async () => {
    const [
      minimaxApiKey,
      openAiApiKey,
      geminiApiKey,
      modelName,
      baseUrl,
      providerName,
      aiNotif,
      marketDataProvider,
      alphaVantageApiKey,
      alphaVantageEnabled,
      alphaVantageDailyRemaining,
      alphaVantageLastResetDate,
      fugleApiKey,
      fugleEnabled,
      marketDataRecommendationSeen,
    ] = await Promise.all([
      getItemAsync(MINIMAX_API_KEY_STORE_KEY),
      getItemAsync(OPENAI_API_KEY_STORE_KEY),
      getItemAsync(GEMINI_API_KEY_STORE_KEY),
      getItemAsync(MODEL_NAME_STORE_KEY),
      getItemAsync(BASE_URL_STORE_KEY),
      getItemAsync(PROVIDER_NAME_STORE_KEY),
      getItemAsync(AI_NOTIFICATIONS_STORE_KEY),
      getItemAsync(MARKET_DATA_PROVIDER_STORE_KEY),
      getItemAsync(ALPHA_VANTAGE_API_KEY_STORE_KEY),
      getItemAsync(ALPHA_VANTAGE_ENABLED_STORE_KEY),
      getItemAsync(ALPHA_VANTAGE_DAILY_REMAINING_STORE_KEY),
      getItemAsync(ALPHA_VANTAGE_LAST_RESET_STORE_KEY),
      getItemAsync(FUGLE_API_KEY_STORE_KEY),
      getItemAsync(FUGLE_ENABLED_STORE_KEY),
      getItemAsync(MARKET_DATA_RECOMMENDATION_SEEN_STORE_KEY),
    ]);
    const provider = resolveProvider(providerName ?? undefined);
    const resolvedProviderName = provider.name as AIProviderName;
    const resolvedBaseUrl = provider.baseUrl;
    let resolvedMinimaxApiKey = minimaxApiKey ?? '';
    let resolvedOpenAiApiKey = openAiApiKey ?? '';
    let resolvedGeminiApiKey = geminiApiKey ?? '';

    // Migrate the legacy shared API key into the currently selected provider slot
    // so existing users do not lose access after switching to per-provider storage.
    if (resolvedProviderName === 'OpenAI' && !resolvedOpenAiApiKey && minimaxApiKey) {
      resolvedOpenAiApiKey = minimaxApiKey;
      await setItemAsync(OPENAI_API_KEY_STORE_KEY, minimaxApiKey);
    }
    if (resolvedProviderName === 'Google Gemini' && !resolvedGeminiApiKey && minimaxApiKey) {
      resolvedGeminiApiKey = minimaxApiKey;
      await setItemAsync(GEMINI_API_KEY_STORE_KEY, minimaxApiKey);
    }

    const compatibleModelNames = provider.models;
    const resolvedModelName = compatibleModelNames.includes(modelName ?? '')
      ? (modelName ?? compatibleModelNames[0])
      : compatibleModelNames[0];
    const today = getLocalDateKey();
    const parsedRemaining = Number.parseInt(alphaVantageDailyRemaining ?? '', 10);
    const quotaResetNeeded = alphaVantageLastResetDate !== today;
    const resolvedRemaining = quotaResetNeeded
      ? ALPHA_VANTAGE_DAILY_QUOTA
      : Number.isFinite(parsedRemaining)
        ? Math.max(0, Math.min(ALPHA_VANTAGE_DAILY_QUOTA, parsedRemaining))
        : ALPHA_VANTAGE_DAILY_QUOTA;
    const resolvedResetDate = quotaResetNeeded ? today : (alphaVantageLastResetDate ?? today);

    if (quotaResetNeeded || !alphaVantageLastResetDate || !Number.isFinite(parsedRemaining)) {
      await Promise.all([
        setItemAsync(ALPHA_VANTAGE_DAILY_REMAINING_STORE_KEY, String(resolvedRemaining)),
        setItemAsync(ALPHA_VANTAGE_LAST_RESET_STORE_KEY, resolvedResetDate),
      ]);
    }

    if (resolvedModelName !== modelName) {
      await setItemAsync(MODEL_NAME_STORE_KEY, resolvedModelName);
    }
    if (resolvedBaseUrl !== (baseUrl ?? '')) {
      await setItemAsync(BASE_URL_STORE_KEY, resolvedBaseUrl);
    }
    if (resolvedProviderName !== providerName) {
      await setItemAsync(PROVIDER_NAME_STORE_KEY, resolvedProviderName);
    }

    const activeApiKey = getProviderApiKey(resolvedProviderName, {
      minimaxApiKey: resolvedMinimaxApiKey,
      openAiApiKey: resolvedOpenAiApiKey,
      geminiApiKey: resolvedGeminiApiKey,
    });

    set({
      apiKey: activeApiKey,
      minimaxApiKey: resolvedMinimaxApiKey,
      openAiApiKey: resolvedOpenAiApiKey,
      geminiApiKey: resolvedGeminiApiKey,
      modelName: resolvedModelName,
      baseUrl: resolvedBaseUrl,
      providerName: resolvedProviderName,
      aiNotificationsEnabled: aiNotif !== 'false',
      marketDataProvider:
        marketDataProvider === 'alpha_vantage'
          ? 'alpha_vantage'
          : marketDataProvider === 'fugle'
            ? 'fugle'
            : 'twse_yahoo',
      alphaVantageApiKey: alphaVantageApiKey ?? '',
      alphaVantageEnabled: alphaVantageEnabled === 'true',
      alphaVantageDailyRemaining: resolvedRemaining,
      alphaVantageLastResetDate: resolvedResetDate,
      fugleApiKey: fugleApiKey ?? '',
      fugleEnabled: fugleEnabled === 'true',
      marketDataRecommendationSeen: marketDataRecommendationSeen === 'true',
    });
  },

  deleteApiKey: async () => {
    const providerName = get().providerName;
    await deleteItemAsync(getApiKeyStoreKey(providerName));
    set((state) => ({
      ...setProviderApiKeyInState(providerName, '', state),
      apiKey: '',
    }));
  },

  deleteAlphaVantageApiKey: async () => {
    const today = getLocalDateKey();
    await Promise.all([
      deleteItemAsync(ALPHA_VANTAGE_API_KEY_STORE_KEY),
      setItemAsync(ALPHA_VANTAGE_ENABLED_STORE_KEY, 'false'),
      setItemAsync(ALPHA_VANTAGE_DAILY_REMAINING_STORE_KEY, String(ALPHA_VANTAGE_DAILY_QUOTA)),
      setItemAsync(ALPHA_VANTAGE_LAST_RESET_STORE_KEY, today),
    ]);
    set({
      alphaVantageApiKey: '',
      alphaVantageEnabled: false,
      alphaVantageDailyRemaining: ALPHA_VANTAGE_DAILY_QUOTA,
      alphaVantageLastResetDate: today,
    });
  },

  deleteFugleApiKey: async () => {
    await Promise.all([
      deleteItemAsync(FUGLE_API_KEY_STORE_KEY),
      setItemAsync(FUGLE_ENABLED_STORE_KEY, 'false'),
    ]);
    set({
      fugleApiKey: '',
      fugleEnabled: false,
    });
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
    const providerName = name as AIProviderName;
    const providerApiKey = get().getApiKeyForProvider(providerName);
    await Promise.all([
      setItemAsync(PROVIDER_NAME_STORE_KEY, providerName),
      setItemAsync(BASE_URL_STORE_KEY, baseUrl),
      setItemAsync(MODEL_NAME_STORE_KEY, defaultModel),
    ]);
    set({ providerName, baseUrl, modelName: defaultModel, apiKey: providerApiKey });
  },

  setAiNotificationsEnabled: async (enabled) => {
    await setItemAsync(AI_NOTIFICATIONS_STORE_KEY, String(enabled));
    set({ aiNotificationsEnabled: enabled });
  },

  setMarketDataProvider: async (provider) => {
    await setItemAsync(MARKET_DATA_PROVIDER_STORE_KEY, provider);
    set({ marketDataProvider: provider });
  },

  setAlphaVantageEnabled: async (enabled) => {
    await setItemAsync(ALPHA_VANTAGE_ENABLED_STORE_KEY, String(enabled));
    set({ alphaVantageEnabled: enabled });
  },

  setFugleEnabled: async (enabled) => {
    await setItemAsync(FUGLE_ENABLED_STORE_KEY, String(enabled));
    set({ fugleEnabled: enabled });
  },

  markMarketDataRecommendationSeen: async () => {
    await setItemAsync(MARKET_DATA_RECOMMENDATION_SEEN_STORE_KEY, 'true');
    set({ marketDataRecommendationSeen: true });
  },

  ensureAlphaVantageQuotaCurrent: async () => {
    const today = getLocalDateKey();
    if (get().alphaVantageLastResetDate === today) return;
    await Promise.all([
      setItemAsync(ALPHA_VANTAGE_DAILY_REMAINING_STORE_KEY, String(ALPHA_VANTAGE_DAILY_QUOTA)),
      setItemAsync(ALPHA_VANTAGE_LAST_RESET_STORE_KEY, today),
    ]);
    set({
      alphaVantageDailyRemaining: ALPHA_VANTAGE_DAILY_QUOTA,
      alphaVantageLastResetDate: today,
    });
  },

  resetAlphaVantageQuota: async () => {
    const today = getLocalDateKey();
    await Promise.all([
      setItemAsync(ALPHA_VANTAGE_DAILY_REMAINING_STORE_KEY, String(ALPHA_VANTAGE_DAILY_QUOTA)),
      setItemAsync(ALPHA_VANTAGE_LAST_RESET_STORE_KEY, today),
    ]);
    set({
      alphaVantageDailyRemaining: ALPHA_VANTAGE_DAILY_QUOTA,
      alphaVantageLastResetDate: today,
    });
  },

  recordAlphaVantageRequest: async () => {
    await get().ensureAlphaVantageQuotaCurrent();
    const today = getLocalDateKey();
    const remaining = Math.max(0, get().alphaVantageDailyRemaining - 1);
    await Promise.all([
      setItemAsync(ALPHA_VANTAGE_DAILY_REMAINING_STORE_KEY, String(remaining)),
      setItemAsync(ALPHA_VANTAGE_LAST_RESET_STORE_KEY, today),
    ]);
    set({
      alphaVantageDailyRemaining: remaining,
      alphaVantageLastResetDate: today,
    });
    return remaining;
  },

  markAlphaVantageLimitReached: async () => {
    const today = getLocalDateKey();
    await Promise.all([
      setItemAsync(ALPHA_VANTAGE_DAILY_REMAINING_STORE_KEY, '0'),
      setItemAsync(ALPHA_VANTAGE_LAST_RESET_STORE_KEY, today),
    ]);
    set({
      alphaVantageDailyRemaining: 0,
      alphaVantageLastResetDate: today,
    });
  },
}));

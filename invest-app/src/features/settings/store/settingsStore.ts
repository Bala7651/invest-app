import { create } from 'zustand';
import { setItemAsync, getItemAsync, deleteItemAsync } from 'expo-secure-store';

export type GlowLevel = 'subtle' | 'medium' | 'heavy';
export type MarketDataProvider = 'twse_yahoo' | 'alpha_vantage';
export const ALPHA_VANTAGE_DAILY_QUOTA = 25;

const API_KEY_STORE_KEY = 'minimax_api_key';
const MODEL_NAME_STORE_KEY = 'minimax_model_name';
const BASE_URL_STORE_KEY = 'minimax_base_url';
const PROVIDER_NAME_STORE_KEY = 'ai_provider_name';
const AI_NOTIFICATIONS_STORE_KEY = 'ai_notifications_enabled';
const MARKET_DATA_PROVIDER_STORE_KEY = 'market_data_provider';
const ALPHA_VANTAGE_API_KEY_STORE_KEY = 'alpha_vantage_api_key';
const ALPHA_VANTAGE_ENABLED_STORE_KEY = 'alpha_vantage_enabled';
const ALPHA_VANTAGE_DAILY_REMAINING_STORE_KEY = 'alpha_vantage_daily_remaining';
const ALPHA_VANTAGE_LAST_RESET_STORE_KEY = 'alpha_vantage_last_reset';

function getLocalDateKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface SettingsState {
  glowLevel: GlowLevel;
  apiKey: string;
  modelName: string;
  baseUrl: string;
  providerName: string;
  aiNotificationsEnabled: boolean;
  marketDataProvider: MarketDataProvider;
  alphaVantageApiKey: string;
  alphaVantageEnabled: boolean;
  alphaVantageDailyRemaining: number;
  alphaVantageLastResetDate: string;
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
  setAlphaVantageEnabled: (enabled: boolean) => Promise<void>;
  ensureAlphaVantageQuotaCurrent: () => Promise<void>;
  resetAlphaVantageQuota: () => Promise<void>;
  recordAlphaVantageRequest: () => Promise<number>;
  markAlphaVantageLimitReached: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  glowLevel: 'subtle',
  apiKey: '',
  modelName: 'MiniMax-M2.5',
  baseUrl: 'https://api.minimax.io/v1',
  providerName: 'MiniMax',
  aiNotificationsEnabled: true,
  marketDataProvider: 'twse_yahoo',
  alphaVantageApiKey: '',
  alphaVantageEnabled: false,
  alphaVantageDailyRemaining: ALPHA_VANTAGE_DAILY_QUOTA,
  alphaVantageLastResetDate: getLocalDateKey(),

  setGlowLevel: (level) => set({ glowLevel: level }),

  saveApiKey: async (key) => {
    await setItemAsync(API_KEY_STORE_KEY, key);
    set({ apiKey: key });
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

  loadFromSecureStore: async () => {
    const [
      apiKey,
      modelName,
      baseUrl,
      providerName,
      aiNotif,
      marketDataProvider,
      alphaVantageApiKey,
      alphaVantageEnabled,
      alphaVantageDailyRemaining,
      alphaVantageLastResetDate,
    ] = await Promise.all([
      getItemAsync(API_KEY_STORE_KEY),
      getItemAsync(MODEL_NAME_STORE_KEY),
      getItemAsync(BASE_URL_STORE_KEY),
      getItemAsync(PROVIDER_NAME_STORE_KEY),
      getItemAsync(AI_NOTIFICATIONS_STORE_KEY),
      getItemAsync(MARKET_DATA_PROVIDER_STORE_KEY),
      getItemAsync(ALPHA_VANTAGE_API_KEY_STORE_KEY),
      getItemAsync(ALPHA_VANTAGE_ENABLED_STORE_KEY),
      getItemAsync(ALPHA_VANTAGE_DAILY_REMAINING_STORE_KEY),
      getItemAsync(ALPHA_VANTAGE_LAST_RESET_STORE_KEY),
    ]);
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

    set({
      apiKey: apiKey ?? '',
      modelName: modelName ?? 'MiniMax-M2.5',
      baseUrl: baseUrl ?? 'https://api.minimax.io/v1',
      providerName: providerName ?? 'MiniMax',
      aiNotificationsEnabled: aiNotif !== 'false',
      marketDataProvider: marketDataProvider === 'alpha_vantage' ? 'alpha_vantage' : 'twse_yahoo',
      alphaVantageApiKey: alphaVantageApiKey ?? '',
      alphaVantageEnabled: alphaVantageEnabled === 'true',
      alphaVantageDailyRemaining: resolvedRemaining,
      alphaVantageLastResetDate: resolvedResetDate,
    });
  },

  deleteApiKey: async () => {
    await deleteItemAsync(API_KEY_STORE_KEY);
    set({ apiKey: '' });
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

  setAlphaVantageEnabled: async (enabled) => {
    await setItemAsync(ALPHA_VANTAGE_ENABLED_STORE_KEY, String(enabled));
    set({ alphaVantageEnabled: enabled });
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

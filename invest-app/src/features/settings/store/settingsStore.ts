import { create } from 'zustand';
import { setItemAsync, getItemAsync, deleteItemAsync } from 'expo-secure-store';

export type GlowLevel = 'subtle' | 'medium' | 'heavy';

const API_KEY_STORE_KEY = 'minimax_api_key';
const MODEL_NAME_STORE_KEY = 'minimax_model_name';
const BASE_URL_STORE_KEY = 'minimax_base_url';

interface SettingsState {
  glowLevel: GlowLevel;
  apiKey: string;
  modelName: string;
  baseUrl: string;
  setGlowLevel: (level: GlowLevel) => void;
  saveApiKey: (key: string) => Promise<void>;
  loadFromSecureStore: () => Promise<void>;
  deleteApiKey: () => Promise<void>;
  setModelName: (name: string) => Promise<void>;
  setBaseUrl: (url: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  glowLevel: 'subtle',
  apiKey: '',
  modelName: 'MiniMax-M2.5',
  baseUrl: 'https://api.minimax.io/v1',

  setGlowLevel: (level) => set({ glowLevel: level }),

  saveApiKey: async (key) => {
    await setItemAsync(API_KEY_STORE_KEY, key);
    set({ apiKey: key });
  },

  loadFromSecureStore: async () => {
    const [apiKey, modelName, baseUrl] = await Promise.all([
      getItemAsync(API_KEY_STORE_KEY),
      getItemAsync(MODEL_NAME_STORE_KEY),
      getItemAsync(BASE_URL_STORE_KEY),
    ]);
    set({
      apiKey: apiKey ?? '',
      modelName: modelName ?? 'MiniMax-M2.5',
      baseUrl: baseUrl ?? 'https://api.minimax.io/v1',
    });
  },

  deleteApiKey: async () => {
    await deleteItemAsync(API_KEY_STORE_KEY);
    set({ apiKey: '' });
  },

  setModelName: async (name) => {
    await setItemAsync(MODEL_NAME_STORE_KEY, name);
    set({ modelName: name });
  },

  setBaseUrl: async (url) => {
    await setItemAsync(BASE_URL_STORE_KEY, url);
    set({ baseUrl: url });
  },
}));

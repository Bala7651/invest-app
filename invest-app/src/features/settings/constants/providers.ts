export interface AIProvider {
  name: string;
  baseUrl: string;
  models: string[];
}

export interface MarketDataProviderOption {
  id: 'twse_yahoo' | 'alpha_vantage';
  label: string;
  description: string;
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    name: 'MiniMax',
    baseUrl: 'https://api.minimax.io/v1',
    models: ['MiniMax-M2.7', 'MiniMax-M2.5', 'MiniMax-Text-01'],
  },
  {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['o3', 'o3-mini', 'o4-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini'],
  },
  {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'],
  },
];

export const MARKET_DATA_PROVIDERS: MarketDataProviderOption[] = [
  {
    id: 'twse_yahoo',
    label: 'TWSE / Yahoo',
    description: '優先使用現有 TWSE 與 Yahoo 補值鏈',
  },
  {
    id: 'alpha_vantage',
    label: 'Alpha Vantage',
    description: '以 Alpha Vantage 穩定報價作為額外 fallback',
  },
];

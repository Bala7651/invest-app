export interface SummaryEntry {
  id: number;
  symbol: string;
  date: string;
  content: string;
  created_at: Date;
}

export interface Credentials {
  apiKey: string;
  modelName: string;
  baseUrl: string;
}

export const ERROR_PREFIX = '__ERROR__:';

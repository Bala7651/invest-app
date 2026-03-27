export interface OHLCVPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = '1D' | '5D' | '1M' | '6M' | '1Y';
export type SelectableChartProvider = 'fugle' | 'twse' | 'yahoo';
export type ChartProvider = SelectableChartProvider | 'auto';

export const TIMEFRAMES = ['1D', '5D', '1M', '6M', '1Y'] as const;

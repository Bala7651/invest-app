export interface AnalysisResult {
  sentimentScore: number;
  sentimentLabel: 'Bullish' | 'Neutral' | 'Bearish';
  sentimentSummary: string;
  technicalSummary: string;
  recommendation: 'Buy' | 'Hold' | 'Sell';
  recommendationReasoning: string;
  riskScore: number;
  riskExplanation: string;
  overallScore: number;
}

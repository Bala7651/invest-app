export interface AnalysisResult {
  technicalScore: number;
  technicalSummary: string;
  trendPosition: '多方主導' | '偏多整理' | '偏空整理' | '空方主導';
  volumeSignal: '顯著放量' | '溫和放量' | '量能持平' | '明顯縮量' | '無資料';
  riskLevel: '低風險' | '中等風險' | '高風險';
  riskExplanation: string;
  outlook: string;
  overallScore: number;
}

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { AnalysisResult } from '../types';
import { AnalysisSkeleton } from './AnalysisSkeleton';

interface Quote {
  symbol: string;
  name: string;
  price: number | null;
  prevClose: number;
  change: number;
  changePct: number;
  fetchedAt: number;
}

interface AnalysisCardProps {
  symbol: string;
  name: string;
  quote: Quote | undefined;
  result: AnalysisResult | undefined;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function scoreColor(score: number): string {
  if (score >= 65) return '#00E676';
  if (score >= 40) return '#FFB300';
  return '#FF1744';
}

function trendColor(pos: string): string {
  if (pos === '多方主導') return '#00E676';
  if (pos === '偏多整理') return '#69F0AE';
  if (pos === '偏空整理') return '#FF6D00';
  return '#FF1744'; // 空方主導
}

function riskLevelColor(level: string): string {
  if (level === '低風險') return '#00E676';
  if (level === '中等風險') return '#FFB300';
  return '#FF1744'; // 高風險
}

export function AnalysisCard({ symbol, name, quote, result, loading, error, onRetry }: AnalysisCardProps) {
  const [expanded, setExpanded] = useState(false);
  const maxHeight = useSharedValue(0);

  const expandStyle = useAnimatedStyle(() => ({
    maxHeight: maxHeight.value,
    overflow: 'hidden',
  }));

  function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    maxHeight.value = withTiming(next ? 2000 : 0, { duration: 250 });
  }

  const priceDisplay = quote?.price != null ? quote.price.toFixed(2) : '—';
  const changeDisplay =
    quote?.price != null
      ? `${quote.change >= 0 ? '+' : ''}${quote.change.toFixed(2)} (${quote.changePct.toFixed(2)}%)`
      : '—';
  const changeColorStyle = quote?.price != null
    ? { color: quote.change >= 0 ? '#00E676' : '#FF1744' }
    : {};

  return (
    <View className="bg-surface border border-border rounded-lg p-4 mb-3">
      <Pressable onPress={toggleExpand}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-text font-bold text-base">{symbol}</Text>
            <Text className="text-muted text-sm mt-0.5">{name}</Text>
          </View>
          <View className="items-end">
            <Text className="text-text font-semibold">{priceDisplay}</Text>
            <Text style={changeColorStyle} className="text-sm mt-0.5">{changeDisplay}</Text>
          </View>
        </View>

        {result && !loading && !error && (
          <View className="flex-row items-center justify-between mt-2">
            <Text style={{ color: scoreColor(result.overallScore) }} className="font-semibold">
              {result.overallScore}/100
            </Text>
            <View
              style={{ backgroundColor: trendColor(result.trendPosition), borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2 }}
            >
              <Text style={{ color: '#000', fontWeight: '700', fontSize: 12 }}>
                {result.trendPosition}
              </Text>
            </View>
          </View>
        )}
      </Pressable>

      {loading && <AnalysisSkeleton />}

      {error && !loading && (
        <View className="mt-3">
          <Text className="text-stock-down text-sm mb-2">{error}</Text>
          <Pressable
            className="bg-surface border border-border rounded px-4 py-2 self-start"
            onPress={onRetry}
          >
            <Text className="text-primary text-sm font-semibold">重試</Text>
          </Pressable>
        </View>
      )}

      {result && !loading && !error && (
        <Animated.View style={expandStyle}>
          <View className="border-t border-border mt-3 pt-3">
            <Text className="text-primary font-semibold mb-1">技術分析</Text>
            <Text style={{ color: scoreColor(result.technicalScore) }} className="text-sm font-semibold">
              {result.technicalScore}/100
            </Text>
            <Text className="text-muted text-sm mt-1">{result.technicalSummary}</Text>
          </View>

          <View className="border-t border-border mt-3 pt-3">
            <Text className="text-primary font-semibold mb-1">趨勢與量能</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <View style={{ backgroundColor: trendColor(result.trendPosition), borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ color: '#000', fontSize: 12, fontWeight: '600' }}>{result.trendPosition}</Text>
              </View>
              <View style={{ backgroundColor: '#1E2A4A', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ color: '#4D7CFF', fontSize: 12, fontWeight: '600' }}>{result.volumeSignal}</Text>
              </View>
            </View>
          </View>

          <View className="border-t border-border mt-3 pt-3">
            <Text className="text-primary font-semibold mb-1">短期展望</Text>
            <Text className="text-muted text-sm">{result.outlook}</Text>
          </View>

          <View className="border-t border-border mt-3 pt-3">
            <Text className="text-primary font-semibold mb-1">風險評估</Text>
            <View style={{ backgroundColor: riskLevelColor(result.riskLevel), borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' }}>
              <Text style={{ color: '#000', fontSize: 12, fontWeight: '600' }}>{result.riskLevel}</Text>
            </View>
            <Text className="text-muted text-sm mt-1">{result.riskExplanation}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

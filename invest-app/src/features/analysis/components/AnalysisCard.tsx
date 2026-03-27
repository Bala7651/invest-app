import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { AnalysisResult } from '../types';
import { AnalysisSkeleton } from './AnalysisSkeleton';
import { Quote } from '../../market/quoteStore';
import { buildQuoteSnapshot } from '../../market/quotePresentation';
import { useI18n } from '../../i18n/useI18n';

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

function trendLabel(pos: string, t: (key: string) => string): string {
  if (pos === '多方主導') return t('analysis.trend.bull');
  if (pos === '偏多整理') return t('analysis.trend.leanBull');
  if (pos === '偏空整理') return t('analysis.trend.leanBear');
  return t('analysis.trend.bear');
}

function volumeLabel(signal: string, t: (key: string) => string): string {
  if (signal === '顯著放量') return t('analysis.volume.heavy');
  if (signal === '溫和放量') return t('analysis.volume.moderate');
  if (signal === '量能持平') return t('analysis.volume.flat');
  if (signal === '明顯縮量') return t('analysis.volume.light');
  return t('analysis.volume.na');
}

function riskLabel(level: string, t: (key: string) => string): string {
  if (level === '低風險') return t('analysis.risk.low');
  if (level === '中等風險') return t('analysis.risk.medium');
  return t('analysis.risk.high');
}

export function AnalysisCard({ symbol, name, quote, result, loading, error, onRetry }: AnalysisCardProps) {
  const { t, language } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const maxHeight = useSharedValue(0);
  const snapshot = buildQuoteSnapshot(name, quote, language);

  const expandStyle = useAnimatedStyle(() => ({
    maxHeight: maxHeight.value,
    overflow: 'hidden',
  }));

  function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    maxHeight.value = withTiming(next ? 2000 : 0, { duration: 250 });
  }

  const priceDisplay = snapshot.price != null ? snapshot.price.toFixed(2) : '—';
  const changeDisplay =
    snapshot.price != null
      ? `${snapshot.change >= 0 ? '+' : ''}${snapshot.change.toFixed(2)} (${snapshot.changePct.toFixed(2)}%)`
      : '—';
  const changeColorStyle = snapshot.price != null
    ? { color: snapshot.change >= 0 ? '#00E676' : '#FF1744' }
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
            {snapshot.sourceMeta ? (
              <Text className="text-muted text-xs mt-0.5">{snapshot.sourceMeta}</Text>
            ) : null}
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
                {trendLabel(result.trendPosition, t)}
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
            <Text className="text-primary text-sm font-semibold">{t('common.retry')}</Text>
          </Pressable>
        </View>
      )}

      {result && !loading && !error && (
        <Animated.View style={expandStyle}>
          <View className="border-t border-border mt-3 pt-3">
            <Text className="text-primary font-semibold mb-1">{t('analysis.technical')}</Text>
            <Text style={{ color: scoreColor(result.technicalScore) }} className="text-sm font-semibold">
              {result.technicalScore}/100
            </Text>
            <Text className="text-muted text-sm mt-1">{result.technicalSummary}</Text>
          </View>

          <View className="border-t border-border mt-3 pt-3">
            <Text className="text-primary font-semibold mb-1">{t('analysis.trendVolume')}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <View style={{ backgroundColor: trendColor(result.trendPosition), borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ color: '#000', fontSize: 12, fontWeight: '600' }}>{trendLabel(result.trendPosition, t)}</Text>
              </View>
              <View style={{ backgroundColor: '#1E2A4A', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ color: '#4D7CFF', fontSize: 12, fontWeight: '600' }}>{volumeLabel(result.volumeSignal, t)}</Text>
              </View>
            </View>
          </View>

          <View className="border-t border-border mt-3 pt-3">
            <Text className="text-primary font-semibold mb-1">{t('analysis.outlook')}</Text>
            <Text className="text-muted text-sm">{result.outlook}</Text>
          </View>

          <View className="border-t border-border mt-3 pt-3">
            <Text className="text-primary font-semibold mb-1">{t('analysis.risk')}</Text>
            <View style={{ backgroundColor: riskLevelColor(result.riskLevel), borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' }}>
              <Text style={{ color: '#000', fontSize: 12, fontWeight: '600' }}>{riskLabel(result.riskLevel, t)}</Text>
            </View>
            <Text className="text-muted text-sm mt-1">{result.riskExplanation}</Text>
          </View>

          <Pressable
            className="border border-primary rounded px-4 py-2 self-start mt-4"
            onPress={onRetry}
          >
            <Text className="text-primary text-sm font-semibold">{t('common.regenerate')}</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

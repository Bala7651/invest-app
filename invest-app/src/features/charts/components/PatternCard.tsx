import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { OHLCVPoint } from '../types';
import { detectPatterns, PatternSignal } from '../services/patternDetector';
import { useI18n } from '../../i18n/useI18n';

interface PatternCardProps {
  candles: OHLCVPoint[] | undefined;
}

function signalColor(signal: PatternSignal): string {
  if (signal === 'bullish') return '#00E676';
  if (signal === 'bearish') return '#FF1744';
  return '#FFB300';
}

function signalLabel(signal: PatternSignal, t: (key: string) => string): string {
  if (signal === 'bullish') return t('charts.signal.bullish');
  if (signal === 'bearish') return t('charts.signal.bearish');
  return t('charts.signal.neutral');
}

function patternKey(name: string): string | null {
  if (name === '早晨之星') return 'charts.pattern.morning_star';
  if (name === '黃昏之星') return 'charts.pattern.evening_star';
  if (name === '吞噬多頭') return 'charts.pattern.bullish_engulfing';
  if (name === '吞噬空頭') return 'charts.pattern.bearish_engulfing';
  if (name === '錘子') return 'charts.pattern.hammer';
  if (name === '倒錘子') return 'charts.pattern.inverted_hammer';
  if (name === '恆星線') return 'charts.pattern.shooting_star';
  if (name === '十字星') return 'charts.pattern.doji';
  return null;
}

export function PatternCard({ candles }: PatternCardProps) {
  const { t } = useI18n();
  const pattern = useMemo(() => {
    if (!candles || candles.length < 3) return null;
    return detectPatterns(candles);
  }, [candles]);

  if (!pattern) return null;

  const color = signalColor(pattern.signal);
  const key = patternKey(pattern.name);
  const patternName = key ? t(`${key}.name`) : pattern.name;
  const patternExplanation = key ? t(`${key}.explanation`) : pattern.explanation;

  return (
    <View className="mx-4 mb-3 bg-surface border border-border rounded-lg p-3">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text className="text-text font-bold text-base">{patternName}</Text>
        <View style={{ backgroundColor: color, borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ color: '#ffffff', fontSize: 12 }}>{signalLabel(pattern.signal, t)}</Text>
        </View>
      </View>
      <Text className="text-muted text-xs mt-1">{patternExplanation}</Text>
    </View>
  );
}

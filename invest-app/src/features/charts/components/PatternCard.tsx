import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { OHLCVPoint } from '../types';
import { detectPatterns, PatternSignal } from '../services/patternDetector';

interface PatternCardProps {
  candles: OHLCVPoint[] | undefined;
}

function signalColor(signal: PatternSignal): string {
  if (signal === 'bullish') return '#00E676';
  if (signal === 'bearish') return '#FF1744';
  return '#FFB300';
}

function signalLabel(signal: PatternSignal): string {
  if (signal === 'bullish') return '看漲';
  if (signal === 'bearish') return '看跌';
  return '中性';
}

export function PatternCard({ candles }: PatternCardProps) {
  const pattern = useMemo(() => {
    if (!candles || candles.length < 3) return null;
    return detectPatterns(candles);
  }, [candles]);

  if (!pattern) return null;

  const color = signalColor(pattern.signal);

  return (
    <View className="mx-4 mb-3 bg-surface border border-border rounded-lg p-3">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text className="text-text font-bold text-base">{pattern.name}</Text>
        <View style={{ backgroundColor: color, borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ color: '#ffffff', fontSize: 12 }}>{signalLabel(pattern.signal)}</Text>
        </View>
      </View>
      <Text className="text-muted text-xs mt-1">{pattern.explanation}</Text>
    </View>
  );
}

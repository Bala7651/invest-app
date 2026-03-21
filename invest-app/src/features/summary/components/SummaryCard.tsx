import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { SummaryEntry, ERROR_PREFIX } from '../types';

interface SummaryCardProps {
  date: string;
  entries: SummaryEntry[];
  defaultExpanded?: boolean;
}

export function SummaryCard({ date, entries, defaultExpanded = false }: SummaryCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const maxHeight = useSharedValue(defaultExpanded ? 2000 : 0);

  const expandStyle = useAnimatedStyle(() => ({
    maxHeight: maxHeight.value,
    overflow: 'hidden',
  }));

  function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    maxHeight.value = withTiming(next ? 2000 : 0, { duration: 250 });
  }

  const errorCount = entries.filter(e => e.content.startsWith(ERROR_PREFIX)).length;

  return (
    <View className="bg-surface border border-border rounded-lg p-4 mb-3">
      <Pressable onPress={toggleExpand}>
        <View className="flex-row items-center justify-between">
          <Text className="text-text font-bold text-base">{date}</Text>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            {errorCount > 0 && (
              <View style={{ backgroundColor: '#FF1744', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{errorCount} Failed</Text>
              </View>
            )}
            <View style={{ backgroundColor: '#1a1a2e', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text className="text-muted text-xs">{entries.length} stocks</Text>
            </View>
            <Text className="text-muted text-sm">{expanded ? '▲' : '▼'}</Text>
          </View>
        </View>
      </Pressable>

      <Animated.View style={expandStyle}>
        <View className="border-t border-border mt-3 pt-3" style={{ gap: 12 }}>
          {entries.map(entry => {
            const isError = entry.content.startsWith(ERROR_PREFIX);
            const isIndex = entry.symbol === 'TWSE';
            const displayContent = isError
              ? entry.content.slice(ERROR_PREFIX.length)
              : entry.content;

            return (
              <View key={entry.symbol}>
                <View className="flex-row items-center" style={{ gap: 6, marginBottom: 2 }}>
                  <Text
                    className={`font-bold text-sm ${isIndex ? 'text-primary' : 'text-text'}`}
                  >
                    {entry.symbol}
                  </Text>
                  {isError && (
                    <Text className="text-stock-down text-xs">(Failed)</Text>
                  )}
                </View>
                <Text
                  className={`text-sm ${isError ? 'text-stock-down' : 'text-muted'}`}
                >
                  {displayContent}
                </Text>
              </View>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

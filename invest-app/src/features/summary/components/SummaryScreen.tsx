import { useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSummaryStore } from '../store/summaryStore';
import { useSettingsStore } from '../../settings/store/settingsStore';
import { SummaryCard } from './SummaryCard';

interface SummaryScreenProps {
  isActive: boolean;
}

export function SummaryScreen({ isActive }: SummaryScreenProps) {
  const generating = useSummaryStore(s => s.generating);
  const progress = useSummaryStore(s => s.progress);
  const errors = useSummaryStore(s => s.errors);
  const summariesByDate = useSummaryStore(s => s.summariesByDate);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (isActive && !hasLoaded.current) {
      hasLoaded.current = true;
      useSummaryStore.getState().loadSummaries();
    }
  }, [isActive]);

  function handleGenerateNow() {
    const { apiKey, modelName, baseUrl } = useSettingsStore.getState();
    if (!apiKey) {
      Alert.alert('需要 API Key', '請先在設定頁面輸入 API Key');
      return;
    }
    useSummaryStore.getState().generateToday({ apiKey, modelName, baseUrl });
  }

  const sortedDates = Object.keys(summariesByDate).sort((a, b) => b.localeCompare(a));
  const isEmpty = sortedDates.length === 0;
  const errorCount = Object.values(errors).filter(e => e !== null).length;

  return (
    <View className="flex-1 bg-bg px-4 pt-12">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-text text-2xl font-bold">每日摘要</Text>
        <Pressable
          onPress={handleGenerateNow}
          disabled={generating}
        >
          <Text
            className="text-primary text-base"
            style={generating ? { opacity: 0.4 } : undefined}
          >
            Generate Now
          </Text>
        </Pressable>
      </View>

      {generating && (
        <View className="flex-row items-center mb-4" style={{ gap: 10 }}>
          <ActivityIndicator size="small" color="#00E676" />
          <Text className="text-muted text-sm">
            生成中... {progress.done}/{progress.total}
          </Text>
        </View>
      )}

      {!generating && errorCount > 0 && (
        <View
          className="bg-surface border border-border rounded-lg px-4 py-2 mb-4"
        >
          <Text className="text-stock-down text-sm">
            部分股票生成失敗（{errorCount} 支）
          </Text>
        </View>
      )}

      {isEmpty && !generating ? (
        <View className="flex-1 items-center justify-center" style={{ gap: 16 }}>
          <Text className="text-muted text-base text-center" style={{ lineHeight: 24 }}>
            每日市場摘要將於交易日 12:30 自動生成
          </Text>
          <Pressable
            onPress={handleGenerateNow}
            className="bg-primary rounded-lg px-6 py-3"
          >
            <Text style={{ color: '#000', fontWeight: '700', fontSize: 16 }}>立即生成</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {sortedDates.map((date, index) => (
            <SummaryCard
              key={date}
              date={date}
              entries={summariesByDate[date]}
              defaultExpanded={index === 0}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

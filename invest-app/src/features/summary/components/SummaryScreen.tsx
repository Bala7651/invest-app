import { useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSummaryStore } from '../store/summaryStore';
import { useSettingsStore } from '../../settings/store/settingsStore';
import { SummaryCard } from './SummaryCard';
import { useI18n } from '../../i18n/useI18n';

interface SummaryScreenProps {
  isActive: boolean;
}

export function SummaryScreen({ isActive }: SummaryScreenProps) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
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
    const { apiKey, modelName, baseUrl } = useSettingsStore.getState().getActiveAiCredentials();
    if (!apiKey) {
      Alert.alert(t('summary.needApiKeyTitle'), t('summary.needApiKeyBody'));
      return;
    }
    useSummaryStore.getState().generateToday({ apiKey, modelName, baseUrl });
  }

  const sortedDates = Object.keys(summariesByDate).sort((a, b) => b.localeCompare(a));
  const isEmpty = sortedDates.length === 0;
  const twseError = errors.TWSE ?? null;
  const stockErrors = Object.entries(errors).filter(
    ([symbol, error]) => symbol !== 'TWSE' && error !== null
  );

  return (
    <View className="flex-1 bg-bg px-4" style={{ paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 8) + 54 }}>
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-text text-2xl font-bold">{t('summary.title')}</Text>
        <Pressable
          onPress={handleGenerateNow}
          disabled={generating}
        >
          <Text
            className="text-primary text-base"
            style={generating ? { opacity: 0.4 } : undefined}
          >
            {t('summary.generateNow')}
          </Text>
        </Pressable>
      </View>

      {generating && (
        <View className="flex-row items-center mb-4" style={{ gap: 10 }}>
          <ActivityIndicator size="small" color="#00E676" />
          <Text className="text-muted text-sm">
            {t('summary.progress', { done: progress.done, total: progress.total })}
          </Text>
        </View>
      )}

      {!generating && (twseError || stockErrors.length > 0) && (
        <View
          className="bg-surface border border-border rounded-lg px-4 py-3 mb-4"
        >
          {twseError ? (
            <Text className="text-stock-down text-sm">
              {t('summary.indexFailed', { error: twseError })}
            </Text>
          ) : null}
          {stockErrors.length > 0 ? (
            <Text className="text-stock-down text-sm" style={{ marginTop: twseError ? 8 : 0 }}>
              {t('summary.stockFailed', { count: stockErrors.length })}
            </Text>
          ) : null}
          {stockErrors.slice(0, 3).map(([symbol, error]) => (
            <Text
              key={symbol}
              className="text-muted text-xs"
              style={{ marginTop: 4, lineHeight: 18 }}
            >
              {symbol}: {error}
            </Text>
          ))}
          {stockErrors.length > 3 ? (
            <Text className="text-muted text-xs" style={{ marginTop: 4 }}>
              {t('summary.moreFailed', { count: stockErrors.length - 3 })}
            </Text>
          ) : null}
        </View>
      )}

      {isEmpty && !generating ? (
        <View className="flex-1 items-center justify-center" style={{ gap: 16 }}>
          <Text className="text-muted text-base text-center" style={{ lineHeight: 24 }}>
            {t('summary.autoGenerateHint')}
          </Text>
          <Pressable
            onPress={handleGenerateNow}
            className="bg-primary rounded-lg px-6 py-3"
          >
            <Text style={{ color: '#000', fontWeight: '700', fontSize: 16 }}>{t('summary.generateNow')}</Text>
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

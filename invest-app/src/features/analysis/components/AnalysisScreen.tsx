import { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore } from '../../settings/store/settingsStore';
import { useWatchlistStore } from '../../watchlist/store/watchlistStore';
import { useQuoteStore } from '../../market/quoteStore';
import { useAnalysisStore } from '../store/analysisStore';
import { AnalysisCard } from './AnalysisCard';
import { NoApiKeyPrompt } from './NoApiKeyPrompt';

interface AnalysisScreenProps {
  isActive: boolean;
}

export function AnalysisScreen({ isActive }: AnalysisScreenProps) {
  const insets = useSafeAreaInsets();
  const apiKey = useSettingsStore(s => s.apiKey);
  const items = useWatchlistStore(s => s.items);
  const quotes = useQuoteStore(s => s.quotes);
  const { cache, loading, errors, fetchAnalysis } = useAnalysisStore();

  useEffect(() => {
    if (!isActive || !apiKey) return;

    const { apiKey: key, modelName, baseUrl } = useSettingsStore.getState();
    const credentials = { apiKey: key, modelName, baseUrl };
    const currentItems = useWatchlistStore.getState().items;
    const currentQuotes = useQuoteStore.getState().quotes;

    (async () => {
      for (const item of currentItems) {
        const q = currentQuotes[item.symbol];
        const quoteData = q
          ? {
              name: q.name,
              price: q.price,
              change: q.change,
              changePct: q.changePct,
              prevClose: q.prevClose,
              volume: q.volume,
              open: q.open,
              high: q.high,
              low: q.low,
            }
          : {
              name: item.name,
              price: null,
              change: 0,
              changePct: 0,
              prevClose: 0,
              volume: 0,
            };
        await fetchAnalysis(item.symbol, quoteData, credentials);
      }
    })();
  }, [isActive]);

  if (!apiKey) {
    return <NoApiKeyPrompt />;
  }

  return (
    <View className="flex-1" style={{ paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 8) + 54 }}>
      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 16 }}>
        <Text className="text-primary text-2xl font-bold mb-4">AI 分析</Text>

        {items.length === 0 ? (
          <Text className="text-muted text-center mt-8">
            請先將股票加入自選清單
          </Text>
        ) : (
          items.map(item => {
            const quote = quotes[item.symbol];
            return (
              <AnalysisCard
                key={item.symbol}
                symbol={item.symbol}
                name={item.name}
                quote={quote}
                result={cache[item.symbol]}
                loading={loading[item.symbol] ?? false}
                error={errors[item.symbol] ?? null}
                onRetry={() => {
                  const { apiKey: key, modelName, baseUrl } = useSettingsStore.getState();
                  const q = useQuoteStore.getState().quotes[item.symbol];
                  const quoteData = q
                    ? {
                        name: q.name,
                        price: q.price,
                        change: q.change,
                        changePct: q.changePct,
                        prevClose: q.prevClose,
                        volume: q.volume,
                        open: q.open,
                        high: q.high,
                        low: q.low,
                      }
                    : {
                        name: item.name,
                        price: null,
                        change: 0,
                        changePct: 0,
                        prevClose: 0,
                        volume: 0,
                      };
                  fetchAnalysis(item.symbol, quoteData, { apiKey: key, modelName, baseUrl });
                }}
              />
            );
          })
        )}
      </ScrollView>

      <View className="bg-bg border-t border-border py-2">
        <Text className="text-muted text-xs text-center">本內容不構成投資建議</Text>
      </View>
    </View>
  );
}

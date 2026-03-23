import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWatchlistStore } from '../../watchlist/store/watchlistStore';
import { useQuoteStore } from '../../market/quoteStore';
import { useSettingsStore } from '../../settings/store/settingsStore';
import { useHoldingsStore } from '../store/holdingsStore';
import {
  callPortfolioMiniMax,
  callPortfolioFollowUp,
  buildDetailedAnalysisPrompt,
} from '../services/portfolioAiService';
import { NoApiKeyPrompt } from '../../analysis/components/NoApiKeyPrompt';

interface PortfolioScreenProps {
  isActive: boolean;
}


export function PortfolioScreen({ isActive }: PortfolioScreenProps) {
  const insets = useSafeAreaInsets();
  const items = useWatchlistStore((s) => s.items);
  const quotes = useQuoteStore((s) => s.quotes);
  const holdings = useHoldingsStore((s) => s.holdings);
  const apiKey = useSettingsStore((s) => s.apiKey);
  const modelName = useSettingsStore((s) => s.modelName);
  const baseUrl = useSettingsStore((s) => s.baseUrl);

  const [isLots, setIsLots] = useState(true);
  const analysisResult = useHoldingsStore((s) => s.lastAnalysis);
  const chatHistory = useHoldingsStore((s) => s.chatHistory);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [followUpText, setFollowUpText] = useState('');
  const [followUpLoading, setFollowUpLoading] = useState(false);

  const hasLoaded = useRef(false);

  useEffect(() => {
    if (isActive && !hasLoaded.current) {
      hasLoaded.current = true;
      useHoldingsStore.getState().loadHoldings();
    }
  }, [isActive]);

  function getDisplayQuantity(symbol: string): string {
    const holding = holdings[symbol];
    if (!holding || holding.quantity === 0) return '';
    if (isLots) {
      return String(holding.quantity / 1000);
    }
    return String(holding.quantity);
  }

  function handleQuantityChange(symbol: string, name: string, text: string) {
    const raw = parseFloat(text);
    if (isNaN(raw) || raw < 0) {
      useHoldingsStore.getState().setQuantity(symbol, name, 0);
      return;
    }
    const shares = isLots ? raw * 1000 : raw;
    useHoldingsStore.getState().setQuantity(symbol, name, shares);
  }

  async function handleAnalyze() {
    if (!apiKey || items.length === 0 || analysisLoading) return;

    setAnalysisLoading(true);
    setAnalysisError(null);
    useHoldingsStore.getState().setLastAnalysis(null);
    useHoldingsStore.getState().clearChatHistory();

    try {
      const symbols = items.map(item => item.symbol);
      await useQuoteStore.getState().forceRefresh(symbols);
      const latestQuotes = useQuoteStore.getState().quotes;

      const entries = items.map((item) => {
        const q = latestQuotes[item.symbol] ?? quotes[item.symbol];
        const holding = holdings[item.symbol];
        return {
          symbol: item.symbol,
          name: item.name,
          quantity: holding?.quantity ?? 0,
          currentPrice: q?.price ?? null,
        };
      });

      const result = await callPortfolioMiniMax(entries, { apiKey, modelName, baseUrl });
      if (!result) {
        setAnalysisError('AI 回應為空');
        return;
      }
      useHoldingsStore.getState().setLastAnalysis(result);
      useHoldingsStore.getState().setChatHistory([
        { role: 'user', content: buildDetailedAnalysisPrompt(entries) },
        { role: 'assistant', content: result.paragraph },
      ]);
    } catch (e) {
      setAnalysisError(String(e));
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function handleFollowUp() {
    const question = followUpText.trim();
    if (!question || followUpLoading) return;
    setFollowUpText('');
    setFollowUpLoading(true);

    try {
      const response = await callPortfolioFollowUp(
        useHoldingsStore.getState().chatHistory,
        question,
        { apiKey, modelName, baseUrl },
      );
      if (response) {
        useHoldingsStore.getState().appendChatMessage({ role: 'user', content: question });
        useHoldingsStore.getState().appendChatMessage({ role: 'assistant', content: response });
      }
    } catch {
      // silently ignore follow-up errors
    } finally {
      setFollowUpLoading(false);
    }
  }

  if (!apiKey) {
    return (
      <View
        className="flex-1 bg-bg px-4"
        style={{
          paddingTop: insets.top + 24,
          paddingBottom: Math.max(insets.bottom, 8) + 54,
        }}
      >
        <Text className="text-text text-2xl font-bold mb-4">投資組合</Text>
        <NoApiKeyPrompt />
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-bg"
      style={{
        paddingTop: insets.top + 24,
        paddingBottom: Math.max(insets.bottom, 8) + 54,
      }}
    >
      {/* Header */}
      <View className="px-4 mb-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-text text-2xl font-bold">投資組合</Text>
          {/* Lots / Shares toggle */}
          <View
            className="flex-row bg-surface border border-border rounded-lg overflow-hidden"
            style={{ gap: 0 }}
          >
            <Pressable
              onPress={() => setIsLots(true)}
              style={[
                { paddingHorizontal: 12, paddingVertical: 6 },
                isLots ? { backgroundColor: '#4D7CFF' } : undefined,
              ]}
            >
              <Text
                style={{
                  color: isLots ? '#050508' : '#9E9E9E',
                  fontWeight: isLots ? '700' : '400',
                  fontSize: 13,
                }}
              >
                張
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setIsLots(false)}
              style={[
                { paddingHorizontal: 12, paddingVertical: 6 },
                !isLots ? { backgroundColor: '#4D7CFF' } : undefined,
              ]}
            >
              <Text
                style={{
                  color: !isLots ? '#050508' : '#9E9E9E',
                  fontWeight: !isLots ? '700' : '400',
                  fontSize: 13,
                }}
              >
                股
              </Text>
            </Pressable>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: '#4D7CFF', opacity: 0.6, marginTop: 4 }} />
      </View>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        {/* Stock rows */}
        {items.length === 0 ? (
          <View className="flex-1 items-center justify-center py-12">
            <Text className="text-muted text-base text-center">
              請先將股票加入自選清單
            </Text>
          </View>
        ) : (
          items.map((item) => {
            const q = quotes[item.symbol];
            const holding = holdings[item.symbol];
            const price = q?.price ?? null;
            const sharesHeld = holding?.quantity ?? 0;
            const value =
              price !== null && sharesHeld > 0
                ? `${(sharesHeld * price).toLocaleString()} 元`
                : null;

            return (
              <View
                key={item.symbol}
                className="bg-surface border border-border rounded-lg px-4 py-3 mb-2 flex-row items-center"
              >
                {/* Stock info */}
                <View style={{ flex: 1 }}>
                  <Text className="text-text text-sm font-semibold" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-muted text-xs">{item.symbol}</Text>
                  {value ? (
                    <Text className="text-primary text-xs" style={{ marginTop: 2 }}>
                      {value}
                    </Text>
                  ) : null}
                </View>

                {/* Quantity input */}
                <View style={{ alignItems: 'flex-end' }}>
                  <TextInput
                    value={getDisplayQuantity(item.symbol)}
                    onChangeText={(text) =>
                      handleQuantityChange(item.symbol, item.name, text)
                    }
                    keyboardType="numeric"
                    placeholder={isLots ? '張數' : '股數'}
                    placeholderTextColor="#616161"
                    style={{
                      color: '#E0E0E0',
                      backgroundColor: '#0D0D14',
                      borderColor: '#1E2A4A',
                      borderWidth: 1,
                      borderRadius: 6,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      width: 80,
                      textAlign: 'right',
                      fontSize: 14,
                    }}
                  />
                  <Text className="text-muted" style={{ fontSize: 10, marginTop: 2 }}>
                    {isLots ? '張 (×1000股)' : '股'}
                  </Text>
                </View>
              </View>
            );
          })
        )}

        {/* Analyze button */}
        <Pressable
          onPress={handleAnalyze}
          disabled={analysisLoading || items.length === 0}
          className="border border-primary rounded-lg py-3 my-4 items-center"
          style={
            analysisLoading || items.length === 0 ? { opacity: 0.4 } : undefined
          }
        >
          {analysisLoading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color="#4D7CFF" />
              <Text className="text-primary font-semibold text-base">分析中...</Text>
            </View>
          ) : (
            <Text className="text-primary font-semibold text-base">分析投資組合</Text>
          )}
        </Pressable>

        {/* Error card */}
        {analysisError ? (
          <View className="bg-surface border border-border rounded-lg px-4 py-4 mb-4">
            <Text className="text-stock-down text-sm mb-2">{analysisError}</Text>
            <Pressable onPress={handleAnalyze}>
              <Text className="text-primary text-sm">重試</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Analysis result card */}
        {analysisResult ? (
          <>
            <View className="bg-surface border border-border rounded-lg px-4 py-4 mb-4">
              {analysisResult.paragraph ? (
                <Text className="text-text text-sm" style={{ lineHeight: 22 }}>
                  {analysisResult.paragraph}
                </Text>
              ) : null}
            </View>

            {/* Follow-up chat exchanges (skip first 2 = initial Q&A) */}
            {chatHistory.slice(2).map((msg, i) => (
              <View
                key={i}
                className="rounded-lg px-4 py-3 mb-2"
                style={{
                  backgroundColor: msg.role === 'user' ? '#0D0D14' : '#111827',
                  borderWidth: 1,
                  borderColor: msg.role === 'user' ? '#4D7CFF' : '#1E2A4A',
                }}
              >
                <Text
                  style={{
                    color: msg.role === 'user' ? '#4D7CFF' : '#E0E0E0',
                    fontSize: 13,
                    lineHeight: 20,
                  }}
                >
                  {msg.content}
                </Text>
              </View>
            ))}

            {/* Follow-up input */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
                marginTop: 4,
              }}
            >
              <TextInput
                value={followUpText}
                onChangeText={setFollowUpText}
                onSubmitEditing={handleFollowUp}
                placeholder="繼續追問..."
                placeholderTextColor="#616161"
                returnKeyType="send"
                style={{
                  flex: 1,
                  color: '#E0E0E0',
                  backgroundColor: '#0D0D14',
                  borderColor: '#1E2A4A',
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  fontSize: 14,
                }}
              />
              <Pressable
                onPress={handleFollowUp}
                disabled={followUpLoading || !followUpText.trim()}
                style={[
                  {
                    borderWidth: 1,
                    borderColor: '#4D7CFF',
                    borderRadius: 8,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                  },
                  (followUpLoading || !followUpText.trim()) ? { opacity: 0.4 } : undefined,
                ]}
              >
                {followUpLoading ? (
                  <ActivityIndicator size="small" color="#4D7CFF" />
                ) : (
                  <Text style={{ color: '#4D7CFF', fontSize: 14, fontWeight: '600' }}>送出</Text>
                )}
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

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
import { buildQuoteSnapshot } from '../../market/quotePresentation';
import { useSettingsStore } from '../../settings/store/settingsStore';
import { useHoldingsStore } from '../store/holdingsStore';
import {
  callPortfolioMiniMax,
  callPortfolioFollowUp,
  generatePortfolioSuggestedQuestions,
  buildDetailedAnalysisPrompt,
  ChatMessage,
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
  const hasActiveAiKey = useSettingsStore((s) => s.hasActiveAiKey);

  const [isLots, setIsLots] = useState(true);
  const analysisResult = useHoldingsStore((s) => s.lastAnalysis);
  const chatHistory = useHoldingsStore((s) => s.chatHistory);
  const suggestedQuestions = useHoldingsStore((s) => s.suggestedQuestions);
  const suggestedQuestionsSource = useHoldingsStore((s) => s.suggestedQuestionsSource);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [followUpError, setFollowUpError] = useState<string | null>(null);

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

  function getDisplayEntryPrice(symbol: string): string {
    const holding = holdings[symbol];
    if (!holding || holding.entry_price == null) return '';
    return String(holding.entry_price);
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

  function handleEntryPriceChange(symbol: string, name: string, text: string) {
    if (text.trim() === '') {
      useHoldingsStore.getState().setEntryPrice(symbol, name, null);
      return;
    }

    const raw = parseFloat(text);
    if (isNaN(raw) || raw <= 0) return;
    useHoldingsStore.getState().setEntryPrice(symbol, name, raw);
  }

  function buildPortfolioEntries(sourceQuotes = quotes) {
    return items.map((item) => {
      const q = sourceQuotes[item.symbol];
      const snapshot = buildQuoteSnapshot(item.name, q);
      const holding = holdings[item.symbol];
      return {
        symbol: item.symbol,
        name: item.name,
        quantity: holding?.quantity ?? 0,
        currentPrice: snapshot.price,
        entryPrice: holding?.entry_price ?? null,
      };
    });
  }

  async function handleAnalyze() {
    const { apiKey, modelName, baseUrl } = useSettingsStore.getState().getActiveAiCredentials();
    if (!apiKey || items.length === 0 || analysisLoading) return;

    setAnalysisLoading(true);
    setAnalysisError(null);
    setFollowUpError(null);

    try {
      const symbols = items.map(item => item.symbol);
      await useQuoteStore.getState().forceRefresh(symbols);
      const latestQuotes = useQuoteStore.getState().quotes;
      const entries = buildPortfolioEntries(latestQuotes);

      const result = await callPortfolioMiniMax(entries, { apiKey, modelName, baseUrl });
      if (!result) {
        setAnalysisError('AI 回應為空');
        return;
      }
      const nextHistory: ChatMessage[] = [
        { role: 'user', content: buildDetailedAnalysisPrompt(entries) },
        { role: 'assistant', content: result.paragraph },
      ];
      const nextQuestions = await generatePortfolioSuggestedQuestions(
        nextHistory,
        entries,
        { apiKey, modelName, baseUrl },
      );
      useHoldingsStore.getState().setPortfolioAiState({
        lastAnalysis: result,
        chatHistory: nextHistory,
        suggestedQuestions: nextQuestions.questions,
        suggestedQuestionsSource: nextQuestions.source,
      });
    } catch (e) {
      setAnalysisError(String(e));
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function handleFollowUp(question: string) {
    if (!question || followUpLoading) return;
    const { apiKey, modelName, baseUrl } = useSettingsStore.getState().getActiveAiCredentials();
    setFollowUpLoading(true);
    setFollowUpError(null);

    try {
      const response = await callPortfolioFollowUp(
        useHoldingsStore.getState().chatHistory,
        question,
        { apiKey, modelName, baseUrl },
      );
      if (response) {
        const nextHistory = [
          ...useHoldingsStore.getState().chatHistory,
          { role: 'user', content: question } as ChatMessage,
          { role: 'assistant', content: response } as ChatMessage,
        ];
        const nextQuestions = await generatePortfolioSuggestedQuestions(
          nextHistory,
          buildPortfolioEntries(useQuoteStore.getState().quotes),
          { apiKey, modelName, baseUrl },
        );
        useHoldingsStore.getState().setPortfolioAiState({
          lastAnalysis: useHoldingsStore.getState().lastAnalysis,
          chatHistory: nextHistory,
          suggestedQuestions: nextQuestions.questions,
          suggestedQuestionsSource: nextQuestions.source,
        });
      } else {
        setFollowUpError('追問暫時沒有收到 AI 回覆，請稍後再試。');
      }
    } catch (error) {
      setFollowUpError(String(error));
    } finally {
      setFollowUpLoading(false);
    }
  }

  async function handleRegenerateSuggestedQuestions() {
    if (!analysisResult || suggestionsLoading || followUpLoading) return;
    const { apiKey, modelName, baseUrl } = useSettingsStore.getState().getActiveAiCredentials();
    setSuggestionsLoading(true);
    setFollowUpError(null);

    try {
      const nextQuestions = await generatePortfolioSuggestedQuestions(
        useHoldingsStore.getState().chatHistory,
        buildPortfolioEntries(useQuoteStore.getState().quotes),
        { apiKey, modelName, baseUrl },
      );
      useHoldingsStore.getState().setPortfolioAiState({
        lastAnalysis: useHoldingsStore.getState().lastAnalysis,
        chatHistory: useHoldingsStore.getState().chatHistory,
        suggestedQuestions: nextQuestions.questions,
        suggestedQuestionsSource: nextQuestions.source,
      });
    } catch (error) {
      setFollowUpError(String(error));
    } finally {
      setSuggestionsLoading(false);
    }
  }

  if (!hasActiveAiKey()) {
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
            const snapshot = buildQuoteSnapshot(item.name, quotes[item.symbol]);
            const holding = holdings[item.symbol];
            const price = snapshot.price;
            const sharesHeld = holding?.quantity ?? 0;
            const entryPrice = holding?.entry_price ?? null;
            const value =
              price !== null && sharesHeld > 0
                ? `${(sharesHeld * price).toLocaleString()} 元`
                : null;
            const unrealizedPnL =
              price !== null && entryPrice != null && sharesHeld > 0
                ? (price - entryPrice) * sharesHeld
                : null;
            const unrealizedPct =
              price !== null && entryPrice != null && entryPrice > 0 && sharesHeld > 0
                ? ((price - entryPrice) / entryPrice) * 100
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
                  <Text className="text-text text-xs" style={{ marginTop: 2 }}>
                    {price != null ? `${price.toFixed(2)} 元` : '—'}
                  </Text>
                  <Text className="text-muted text-xs" style={{ marginTop: 2 }}>
                    {entryPrice != null ? `買入價 ${entryPrice.toFixed(2)} 元` : '買入價 未設定'}
                  </Text>
                  {snapshot.sourceMeta ? (
                    <Text className="text-muted text-xs" style={{ marginTop: 2 }}>
                      {snapshot.sourceMeta}
                    </Text>
                  ) : null}
                  {value ? (
                    <Text className="text-primary text-xs" style={{ marginTop: 2 }}>
                      {value}
                    </Text>
                  ) : null}
                  {unrealizedPnL != null ? (
                    <Text
                      className={unrealizedPnL >= 0 ? 'text-stock-up' : 'text-stock-down'}
                      style={{ marginTop: 2, fontSize: 12 }}
                    >
                      未實現損益 {unrealizedPnL >= 0 ? '+' : ''}{Math.round(unrealizedPnL).toLocaleString()} 元
                      {unrealizedPct != null ? `（${unrealizedPct >= 0 ? '+' : ''}${unrealizedPct.toFixed(1)}%）` : ''}
                    </Text>
                  ) : null}
                </View>

                {/* Quantity input */}
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <View style={{ alignItems: 'flex-end' }}>
                    <TextInput
                      value={getDisplayEntryPrice(item.symbol)}
                      onChangeText={(text) =>
                        handleEntryPriceChange(item.symbol, item.name, text)
                      }
                      keyboardType="numeric"
                      placeholder="買入價"
                      placeholderTextColor="#616161"
                      style={{
                        color: '#E0E0E0',
                        backgroundColor: '#0D0D14',
                        borderColor: '#1E2A4A',
                        borderWidth: 1,
                        borderRadius: 6,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        width: 108,
                        textAlign: 'right',
                        fontSize: 14,
                      }}
                    />
                    <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text className="text-muted" style={{ fontSize: 10 }}>
                        買入價
                      </Text>
                      {entryPrice != null ? (
                        <Pressable
                          onPress={() => useHoldingsStore.getState().setEntryPrice(item.symbol, item.name, null)}
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            borderWidth: 1,
                            borderColor: '#4D7CFF',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ color: '#4D7CFF', fontSize: 11, fontWeight: '700' }}>x</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>

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

            <View className="mb-4 mt-2">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-primary text-sm font-semibold">延伸追問</Text>
                <Pressable
                  onPress={handleRegenerateSuggestedQuestions}
                  disabled={followUpLoading || suggestionsLoading}
                >
                  <Text
                    className="text-primary text-xs"
                    style={followUpLoading || suggestionsLoading ? { opacity: 0.45 } : undefined}
                  >
                    重新產生 5 題
                  </Text>
                </Pressable>
              </View>

              <Text className="text-muted text-xs mb-3" style={{ lineHeight: 18 }}>
                {suggestedQuestionsSource === 'fallback'
                  ? 'AI 追問建議暫時不可用，以下為依持股內容整理的預設問題。'
                  : '以下問題由 AI 依目前持股與既有對話內容整理。'}
              </Text>

              {followUpError ? (
                <View className="bg-surface border border-border rounded-lg px-4 py-3 mb-3">
                  <Text className="text-stock-down text-xs" style={{ lineHeight: 18 }}>
                    {followUpError}
                  </Text>
                </View>
              ) : null}

              {followUpLoading || suggestionsLoading ? (
                <View
                  className="bg-surface border border-border rounded-lg px-4 py-3"
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color="#4D7CFF" />
                    <Text className="text-muted text-sm">
                      {followUpLoading ? '正在整理下一步問題...' : '正在重新產生追問...'}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {suggestedQuestions.map((question, index) => (
                    <Pressable
                      key={`${index}-${question}`}
                      onPress={() => handleFollowUp(question)}
                      className="bg-surface border border-border rounded-lg px-4 py-3"
                    >
                      <Text className="text-text text-sm" style={{ lineHeight: 20 }}>
                        {question}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

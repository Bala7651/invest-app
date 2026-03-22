import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertModal } from '../../features/alerts/components/AlertModal';
import { AlertStatusBar } from '../../features/alerts/components/AlertStatusBar';
import { CandleChart } from '../../features/charts/components/CandleChart';
import { ChartSkeleton } from '../../features/charts/components/ChartSkeleton';
import { TimeframeSelector } from '../../features/charts/components/TimeframeSelector';
import { VolumeBar } from '../../features/charts/components/VolumeBar';
import { useChartStore } from '../../features/charts/store/chartStore';
import { Timeframe } from '../../features/charts/types';
import { useQuoteStore } from '../../features/market/quoteStore';
import { formatChange } from '../../features/watchlist/components/StockCard';

export default function DetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const quote = useQuoteStore(s => s.quotes[symbol]);
  const { fetchCandles, getCandles, loading, errors } = useChartStore();

  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [crosshairPrice, setCrosshairPrice] = useState<number | null>(null);
  const [alertModalVisible, setAlertModalVisible] = useState(false);

  const key = `${symbol}:${timeframe}`;
  const candles = getCandles(symbol, timeframe);
  const isLoading = loading[key] ?? false;
  const error = errors[key] ?? null;

  useEffect(() => {
    fetchCandles(symbol, timeframe);
  }, [symbol, timeframe]);

  const displayPrice =
    crosshairPrice !== null
      ? crosshairPrice.toFixed(2)
      : quote?.price != null
        ? quote.price.toFixed(2)
        : '—';

  const changeDisplay =
    quote?.price != null ? formatChange(quote.change, quote.changePct) : '—';
  const changeColorClass =
    quote?.price != null
      ? quote.change >= 0
        ? 'text-stock-up'
        : 'text-stock-down'
      : 'text-muted';

  const horizontalPadding = 32;
  const chartWidth = width - horizontalPadding;
  const chartHeight = 260;
  const volumeHeight = 80;

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }}>
      {/* Bloomberg-style header */}
      <View className="flex-row items-center justify-between px-4 mb-4">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} className="mr-4 py-1">
            <Text className="text-primary text-base">返回</Text>
          </Pressable>
          <View>
            <Text className="text-primary font-bold text-lg">{symbol}</Text>
            {quote?.name ? (
              <Text className="text-muted text-sm">{quote.name}</Text>
            ) : null}
          </View>
        </View>
        <View className="items-end flex-row" style={{ gap: 12, alignItems: 'flex-start' }}>
          <View className="items-end">
            <Text className="text-text font-semibold text-xl">{displayPrice}</Text>
            <Text className={`${changeColorClass} text-sm`}>{changeDisplay}</Text>
          </View>
          <Pressable
            testID="alert-bell-icon"
            onPress={() => setAlertModalVisible(true)}
            style={{ paddingTop: 2 }}
          >
            <Text style={{ fontSize: 20 }}>🔔</Text>
          </Pressable>
        </View>
      </View>

      <AlertModal
        visible={alertModalVisible}
        onClose={() => setAlertModalVisible(false)}
        symbol={symbol}
        name={quote?.name ?? symbol}
        currentPrice={quote?.price ?? null}
      />

      {/* Chart area */}
      <View className="flex-1 px-4">
        {isLoading && !candles ? (
          <ChartSkeleton height={chartHeight + volumeHeight + 16} />
        ) : error && !candles ? (
          <View
            style={{ height: chartHeight + volumeHeight + 16 }}
            className="items-center justify-center"
          >
            <Text className="text-stock-down text-sm mb-3">{error}</Text>
            <Pressable
              onPress={() => {
                useChartStore.setState(s => ({
                  errors: { ...s.errors, [key]: null },
                  cache: (() => {
                    const c = { ...s.cache };
                    delete c[key];
                    return c;
                  })(),
                }));
                fetchCandles(symbol, timeframe);
              }}
              className="bg-surface px-4 py-2 rounded-lg border border-border"
            >
              <Text className="text-primary text-sm">重試</Text>
            </Pressable>
          </View>
        ) : candles && candles.length > 0 ? (
          <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
            {/* Candlestick chart */}
            <View className="border border-border rounded-lg overflow-hidden mb-1">
              <CandleChart
                data={candles}
                height={chartHeight}
                onCandleChange={candle => {
                  setCrosshairPrice(candle ? candle.close : null);
                }}
              />
            </View>
            {/* Volume bars */}
            <View
              className="border-t border-border"
              style={{ height: volumeHeight, marginBottom: 12 }}
            >
              <VolumeBar data={candles} height={volumeHeight} width={chartWidth} />
            </View>
          </Animated.View>
        ) : (
          <ChartSkeleton height={chartHeight + volumeHeight + 16} />
        )}

        {/* Timeframe selector */}
        <View style={{ marginTop: 8 }}>
          <TimeframeSelector
            active={timeframe}
            onSelect={setTimeframe}
            loading={isLoading}
          />
        </View>

        {/* Alert status bar */}
        <AlertStatusBar symbol={symbol} onPress={() => setAlertModalVisible(true)} />
      </View>
    </View>
  );
}

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OHLCVPoint } from '../../features/charts/types';
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
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [selectedCandle, setSelectedCandle] = useState<OHLCVPoint | null>(null);

  const key = `${symbol}:${timeframe}`;
  const candles = getCandles(symbol, timeframe);
  const isLoading = loading[key] ?? false;
  const error = errors[key] ?? null;

  useEffect(() => {
    fetchCandles(symbol, timeframe);
  }, [symbol, timeframe]);

  useEffect(() => {
    if (candles && candles.length > 0) {
      setSelectedCandle(candles[candles.length - 1]);
    }
  }, [candles]);

  const displayPrice =
    quote?.price != null
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
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 14, paddingBottom: Math.max(insets.bottom, 8) + 18 }}>
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
          <View>
            {/* OHLC info bar + legend */}
            <View style={{ marginBottom: 8 }}>
              {selectedCandle ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                    {new Date(selectedCandle.timestamp).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}
                  </Text>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
                    開 <Text style={{ color: '#e0e0e0' }}>{selectedCandle.open.toFixed(2)}</Text>
                  </Text>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
                    高 <Text style={{ color: '#00ff88' }}>{selectedCandle.high.toFixed(2)}</Text>
                  </Text>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
                    低 <Text style={{ color: '#ff3366' }}>{selectedCandle.low.toFixed(2)}</Text>
                  </Text>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
                    收{' '}
                    <Text style={{ color: selectedCandle.close >= selectedCandle.open ? '#00ff88' : '#ff3366', fontWeight: '600' }}>
                      {selectedCandle.close.toFixed(2)}
                    </Text>
                  </Text>
                </View>
              ) : null}
              {/* Legend */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, backgroundColor: '#00ff88', borderRadius: 1 }} />
                  <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>收漲（綠）</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, backgroundColor: '#ff3366', borderRadius: 1 }} />
                  <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>收跌（紅）</Text>
                </View>
              </View>
            </View>

            {/* Candlestick chart */}
            <View className="border border-border rounded-lg overflow-hidden mb-1">
              <CandleChart
                data={candles}
                height={chartHeight}
                onCandleChange={c => setSelectedCandle(c)}
              />
            </View>
            {/* Volume bars */}
            <View
              className="border-t border-border"
              style={{ height: volumeHeight, marginBottom: 12 }}
            >
              <VolumeBar data={candles} height={volumeHeight} width={chartWidth} />
            </View>
          </View>
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

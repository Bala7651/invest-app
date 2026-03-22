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
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 8) + 54 }}>
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
            {/* OHLC info card */}
            {selectedCandle ? (() => {
              const isUp = selectedCandle.close >= selectedCandle.open;
              const closeColor = isUp ? '#00ff88' : '#ff3366';
              const periodFirst = candles[0];
              const periodLast = candles[candles.length - 1];
              const periodPct = ((periodLast.close - periodFirst.open) / periodFirst.open) * 100;
              const periodColor = periodPct >= 0 ? '#00ff88' : '#ff3366';
              const periodSign = periodPct >= 0 ? '+' : '';
              return (
                <View style={{ backgroundColor: '#0d0d18', borderRadius: 10, padding: 10, marginBottom: 8 }}>
                  {/* Date + period change */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                      {new Date(selectedCandle.timestamp).toLocaleDateString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric' })}
                      {'  '}
                      <Text style={{ color: isUp ? '#00ff88' : '#ff3366' }}>
                        {isUp ? '▲' : '▼'} {Math.abs(((selectedCandle.close - selectedCandle.open) / selectedCandle.open) * 100).toFixed(2)}%
                      </Text>
                    </Text>
                    <View style={{ backgroundColor: periodColor + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 11, color: periodColor, fontWeight: '700' }}>
                        本期 {periodSign}{periodPct.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                  {/* OHLC row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>開盤</Text>
                      <Text style={{ fontSize: 13, color: '#e0e0e0', fontWeight: '600' }}>{selectedCandle.open.toFixed(2)}</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>最高</Text>
                      <Text style={{ fontSize: 13, color: '#00ff88', fontWeight: '600' }}>{selectedCandle.high.toFixed(2)}</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>最低</Text>
                      <Text style={{ fontSize: 13, color: '#ff3366', fontWeight: '600' }}>{selectedCandle.low.toFixed(2)}</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>收盤</Text>
                      <Text style={{ fontSize: 13, color: closeColor, fontWeight: '700' }}>{selectedCandle.close.toFixed(2)}</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>成交量</Text>
                      <Text style={{ fontSize: 13, color: '#e0e0e0', fontWeight: '600' }}>
                        {selectedCandle.volume >= 1000 ? `${(selectedCandle.volume / 1000).toFixed(0)}K` : String(selectedCandle.volume)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })() : null}

            {/* Candlestick chart */}
            <View className="border border-border rounded-lg overflow-hidden mb-1">
              <CandleChart
                data={candles}
                height={chartHeight}
                onCandleChange={c => setSelectedCandle(c)}
              />
            </View>
            {/* Volume bars */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2, paddingLeft: 2 }}>成交量</Text>
              <View className="border-t border-border" style={{ height: volumeHeight }}>
                <VolumeBar data={candles} height={volumeHeight} width={chartWidth} />
              </View>
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

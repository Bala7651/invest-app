import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OHLCVPoint } from '../../features/charts/types';
import { AlertModal } from '../../features/alerts/components/AlertModal';
import { AlertStatusBar } from '../../features/alerts/components/AlertStatusBar';
import { CandleChart } from '../../features/charts/components/CandleChart';
import { ChartSkeleton } from '../../features/charts/components/ChartSkeleton';
import { PatternCard } from '../../features/charts/components/PatternCard';
import { TimeframeSelector } from '../../features/charts/components/TimeframeSelector';
import { VolumeBar } from '../../features/charts/components/VolumeBar';
import { useChartStore } from '../../features/charts/store/chartStore';
import { Timeframe } from '../../features/charts/types';
import { Quote, useQuoteStore } from '../../features/market/quoteStore';
import { formatChange } from '../../features/watchlist/components/StockCard';
import { useI18n } from '../../features/i18n/useI18n';
import { useSettingsStore } from '../../features/settings/store/settingsStore';

function mergeLiveQuoteIntoCandles(
  candles: OHLCVPoint[] | undefined,
  quote: Quote | undefined,
  timeframe: Timeframe,
): OHLCVPoint[] | undefined {
  if (!candles || candles.length === 0 || timeframe !== '1D') return candles;
  if (!quote || quote.price == null || quote.source !== 'fugle_live') return candles;
  if (candles.length < 10) return candles;

  const timestamp = quote.sourceUpdatedAt ?? quote.fetchedAt;
  if (!timestamp) return candles;

  const bucketDate = new Date(timestamp);
  bucketDate.setSeconds(0, 0);
  const bucketTs = bucketDate.getTime();
  const next = [...candles];
  const last = next[next.length - 1];

  if (Math.abs(last.timestamp - bucketTs) <= 60_000) {
    next[next.length - 1] = {
      ...last,
      close: quote.price,
      high: Math.max(last.high, quote.price),
      low: Math.min(last.low, quote.price),
    };
    return next;
  }

  if (bucketTs > last.timestamp) {
    next.push({
      timestamp: bucketTs,
      open: last.close,
      high: Math.max(last.close, quote.price),
      low: Math.min(last.close, quote.price),
      close: quote.price,
      volume: 0,
    });
  }

  return next;
}

export default function DetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const router = useRouter();
  const { t, language } = useI18n();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const quote = useQuoteStore(s => s.quotes[symbol]);
  const fugleEnabled = useSettingsStore(s => s.fugleEnabled);
  const { fetchCandles, getCandles, loading, errors } = useChartStore();

  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [selectedCandle, setSelectedCandle] = useState<OHLCVPoint | null>(null);

  const key = `${symbol}:${timeframe}`;
  const candles = getCandles(symbol, timeframe);
  const displayCandles = useMemo(
    () => mergeLiveQuoteIntoCandles(candles, quote, timeframe),
    [candles, quote, timeframe],
  );
  const isLoading = loading[key] ?? false;
  const error = errors[key] ?? null;
  const chartSourceLabel =
    timeframe === '1D' && fugleEnabled && (displayCandles?.length ?? 0) >= 10
      ? t('market.source.fugle')
      : 'TWSE';

  useEffect(() => {
    fetchCandles(symbol, timeframe);
  }, [symbol, timeframe]);

  useEffect(() => {
    if (displayCandles && displayCandles.length > 0) {
      setSelectedCandle(displayCandles[displayCandles.length - 1]);
    }
  }, [displayCandles]);

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
            <Text className="text-primary text-base">{t('detail.back')}</Text>
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
        {isLoading && !displayCandles ? (
          <ChartSkeleton height={chartHeight + volumeHeight + 16} />
        ) : error && !displayCandles ? (
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
              <Text className="text-primary text-sm">{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : displayCandles && displayCandles.length > 0 ? (
          <View>
            {/* OHLC info card */}
            {selectedCandle ? (() => {
              const isUp = selectedCandle.close >= selectedCandle.open;
              const closeColor = isUp ? '#00ff88' : '#ff3366';
              const periodFirst = displayCandles[0];
              const periodLast = displayCandles[displayCandles.length - 1];
              const periodPct = ((periodLast.close - periodFirst.open) / periodFirst.open) * 100;
              const periodColor = periodPct >= 0 ? '#00ff88' : '#ff3366';
              const periodSign = periodPct >= 0 ? '+' : '';
              return (
                <View style={{ backgroundColor: '#0d0d18', borderRadius: 10, padding: 10, marginBottom: 8 }}>
                  {/* Date + period change */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                      {new Date(selectedCandle.timestamp).toLocaleDateString(language === 'en' ? 'en-US' : 'zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric' })}
                      {'  '}
                      <Text style={{ color: isUp ? '#00ff88' : '#ff3366' }}>
                        {isUp ? '▲' : '▼'} {Math.abs(((selectedCandle.close - selectedCandle.open) / selectedCandle.open) * 100).toFixed(2)}%
                      </Text>
                    </Text>
                    <View style={{ backgroundColor: periodColor + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 11, color: periodColor, fontWeight: '700' }}>
                        {t('detail.period', { pct: `${periodSign}${periodPct.toFixed(2)}%` })}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                    {t('detail.chartSource', { source: chartSourceLabel })}
                  </Text>
                  {/* OHLC row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>{t('detail.open')}</Text>
                      <Text style={{ fontSize: 13, color: '#e0e0e0', fontWeight: '600' }}>{selectedCandle.open.toFixed(2)}</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>{t('detail.high')}</Text>
                      <Text style={{ fontSize: 13, color: '#00ff88', fontWeight: '600' }}>{selectedCandle.high.toFixed(2)}</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>{t('detail.low')}</Text>
                      <Text style={{ fontSize: 13, color: '#ff3366', fontWeight: '600' }}>{selectedCandle.low.toFixed(2)}</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>{t('detail.close')}</Text>
                      <Text style={{ fontSize: 13, color: closeColor, fontWeight: '700' }}>{selectedCandle.close.toFixed(2)}</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>{t('detail.volume')}</Text>
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
                data={displayCandles}
                height={chartHeight}
                onCandleChange={c => setSelectedCandle(c)}
              />
            </View>
            {/* Volume bars */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2, paddingLeft: 2 }}>{t('detail.volume')}</Text>
              <View className="border-t border-border" style={{ height: volumeHeight }}>
                <VolumeBar data={displayCandles} height={volumeHeight} width={chartWidth} />
              </View>
            </View>
          </View>
        ) : (
          <ChartSkeleton height={chartHeight + volumeHeight + 16} />
        )}

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Pattern card — shown below volume bars when a pattern is detected */}
          <PatternCard candles={displayCandles} />

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
        </ScrollView>
      </View>
    </View>
  );
}

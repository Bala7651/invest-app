import { ReactNode, useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { WatchlistItem } from '../store/watchlistStore';
import { SparklineChart } from './SparklineChart';
import { Quote } from '../../market/quoteStore';
import { buildQuoteSnapshot } from '../../market/quotePresentation';
import { useI18n } from '../../i18n/useI18n';

interface StockCardProps {
  item: WatchlistItem;
  quote: Quote | undefined;
  tickHistory?: number[];
  onPress: () => void;
  dragHandle?: ReactNode;
  disabled?: boolean;
}

export function formatChange(change: number, changePct: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)} (${sign}${changePct.toFixed(2)}%)`;
}

export function StockCard({ item, quote, tickHistory, onPress, dragHandle, disabled = false }: StockCardProps) {
  const { language, t } = useI18n();
  const snapshot = buildQuoteSnapshot(item.name, quote, language);
  const priceDisplay = snapshot.price != null ? snapshot.price.toFixed(2) : '—';
  const changeDisplay =
    snapshot.price != null
      ? formatChange(snapshot.change, snapshot.changePct)
      : t('watchlist.waitingForOpen');
  const changeColorClass =
    snapshot.price != null
      ? snapshot.change >= 0
        ? 'text-stock-up'
        : 'text-stock-down'
      : 'text-muted';
  const detailMeta = snapshot.sourceMeta;

  const flashColor = quote != null && quote.change >= 0 ? '#00E676' : '#FF1744';
  const glowProgress = useSharedValue(0);
  const prevPriceRef = useRef<number | null>(null);

  useEffect(() => {
    const price = quote?.price ?? null;
    if (price !== null && prevPriceRef.current !== null && price !== prevPriceRef.current) {
      glowProgress.value = withSequence(
        withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 350, easing: Easing.in(Easing.quad) }),
      );
    }
    prevPriceRef.current = price;
  }, [quote?.price]);

  const priceStyle = useAnimatedStyle(() => ({
    color: interpolateColor(glowProgress.value, [0, 1], ['#E0E0E0', flashColor]),
  }));

  const sparklineColor = quote != null && quote.change >= 0 ? '#00E676' : '#FF1744';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="bg-surface border border-border rounded-lg px-4 py-3 mb-2"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View className="flex-1" style={{ minWidth: 0, paddingRight: 12 }}>
          <Text className="text-primary font-semibold text-base" numberOfLines={1}>
            {item.symbol}
          </Text>
          <Text className="text-muted text-sm mt-0.5" numberOfLines={1} ellipsizeMode="tail">
            {item.name}
          </Text>
        </View>
        {dragHandle ? <View style={{ marginRight: 8, flexShrink: 0 }}>{dragHandle}</View> : null}
        <View style={{ width: 52, height: 28, marginRight: 8, flexShrink: 0 }}>
          <SparklineChart data={tickHistory ?? []} width={52} height={28} color={sparklineColor} />
        </View>
        <View className="items-end" style={{ width: 112, flexShrink: 0 }}>
          <Animated.Text style={[{ fontWeight: '600', fontSize: 16 }, priceStyle]}>{priceDisplay}</Animated.Text>
          <Text className={`${changeColorClass} text-sm mt-0.5`} numberOfLines={1}>
            {changeDisplay}
          </Text>
        </View>
      </View>
      {detailMeta ? (
        <Text className="text-muted text-xs mt-2" numberOfLines={1} ellipsizeMode="tail">
          {detailMeta}
        </Text>
      ) : null}
    </Pressable>
  );
}

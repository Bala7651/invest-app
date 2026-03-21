import { useEffect, useRef } from 'react';
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

interface Quote {
  symbol: string;
  name: string;
  price: number | null;
  prevClose: number;
  change: number;
  changePct: number;
  fetchedAt: number;
}

interface StockCardProps {
  item: WatchlistItem;
  quote: Quote | undefined;
  tickHistory?: number[];
  onPress: () => void;
  onLongPress?: () => void;
}

export function formatChange(change: number, changePct: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)} (${sign}${changePct.toFixed(2)}%)`;
}

export function StockCard({ item, quote, tickHistory, onPress, onLongPress }: StockCardProps) {
  const priceDisplay = quote?.price != null ? quote.price.toFixed(2) : '—';
  const changeDisplay =
    quote?.price != null
      ? formatChange(quote.change, quote.changePct)
      : 'Waiting for market open';
  const changeColorClass =
    quote?.price != null
      ? quote.change >= 0
        ? 'text-stock-up'
        : 'text-stock-down'
      : 'text-muted';

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
      onLongPress={onLongPress}
      className="bg-surface border border-border rounded-lg px-4 py-3 mb-2 flex-row items-center justify-between"
    >
      <View className="flex-1">
        <Text className="text-primary font-semibold text-base">{item.symbol}</Text>
        <Text className="text-muted text-sm mt-0.5" numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
      </View>
      <View style={{ width: 60, height: 28, marginHorizontal: 8 }}>
        <SparklineChart data={tickHistory ?? []} width={60} height={28} color={sparklineColor} />
      </View>
      <View className="items-end">
        <Animated.Text style={[{ fontWeight: '600', fontSize: 16 }, priceStyle]}>{priceDisplay}</Animated.Text>
        <Text className={`${changeColorClass} text-sm mt-0.5`}>{changeDisplay}</Text>
      </View>
    </Pressable>
  );
}

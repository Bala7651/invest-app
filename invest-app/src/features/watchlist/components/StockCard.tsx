import { Pressable, Text, View } from 'react-native';
import { WatchlistItem } from '../store/watchlistStore';

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
  onPress: () => void;
  onLongPress?: () => void;
}

export function formatChange(change: number, changePct: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)} (${sign}${changePct.toFixed(2)}%)`;
}

export function StockCard({ item, quote, onPress, onLongPress }: StockCardProps) {
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

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      className="bg-surface border border-border rounded-lg px-4 py-3 mb-2 flex-row items-center justify-between"
    >
      <View className="flex-1">
        <Text className="text-primary font-semibold text-base">{item.symbol}</Text>
        <Text className="text-muted text-sm mt-0.5">{item.name}</Text>
      </View>
      <View className="items-end">
        <Text className="text-text font-semibold text-base">{priceDisplay}</Text>
        <Text className={`${changeColorClass} text-sm mt-0.5`}>{changeDisplay}</Text>
      </View>
    </Pressable>
  );
}

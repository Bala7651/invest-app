import { Pressable, Text, View } from 'react-native';

interface EmptyWatchlistProps {
  onAddPress: () => void;
}

export function EmptyWatchlist({ onAddPress }: EmptyWatchlistProps) {
  return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-muted text-lg mb-2">No stocks yet</Text>
      <Text className="text-muted text-sm mb-6">Add stocks to start tracking prices</Text>
      <Pressable
        onPress={onAddPress}
        className="bg-primary px-6 py-3 rounded-lg"
      >
        <Text className="text-bg font-semibold text-base">Add Stock</Text>
      </Pressable>
    </View>
  );
}

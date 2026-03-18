import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function DetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const router = useRouter();
  return (
    <View className="flex-1 bg-bg px-4 pt-12">
      <View className="flex-row items-center mb-6">
        <Pressable onPress={() => router.back()} className="mr-4">
          <Text className="text-primary text-base">Back</Text>
        </Pressable>
        <Text className="text-text text-2xl font-bold">Stock: {symbol}</Text>
      </View>
      <View className="bg-surface rounded-lg p-4 border border-border mb-3">
        <Text className="text-muted text-sm">Chart placeholder — 1D/5D/1M/6M/1Y</Text>
      </View>
      <View className="bg-surface rounded-lg p-4 border border-border">
        <Text className="text-secondary text-base">Price chart will render here in Phase 2</Text>
      </View>
    </View>
  );
}

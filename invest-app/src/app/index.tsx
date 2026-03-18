import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { MarketStatusBar } from '../features/market/MarketStatusBar';

function WatchlistPage() {
  const router = useRouter();
  return (
    <View className="flex-1 bg-bg px-4 pt-12">
      <View className="mb-6">
        <View className="flex-row items-center justify-between">
          <Text className="text-text text-2xl font-bold">Watchlist</Text>
          <Pressable onPress={() => router.push('/settings')}>
            <Text className="text-primary text-base">Settings</Text>
          </Pressable>
        </View>
        <MarketStatusBar />
      </View>
      <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
        <Text className="text-primary text-lg font-semibold">2330 TSMC</Text>
        <Text className="text-stock-up text-base mt-1">+2.45%</Text>
      </View>
      <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
        <Text className="text-secondary text-base">Swipe left for AI Analysis</Text>
      </View>
      <View className="flex-row mt-4 gap-3">
        <View className="bg-surface rounded px-3 py-1">
          <Text className="text-stock-up text-sm">Up: #00E676</Text>
        </View>
        <View className="bg-surface rounded px-3 py-1">
          <Text className="text-stock-down text-sm">Down: #FF1744</Text>
        </View>
      </View>
    </View>
  );
}

function AnalysisPage() {
  return (
    <View className="flex-1 bg-bg px-4 pt-12">
      <Text className="text-primary text-2xl font-bold mb-4">AI Analysis</Text>
      <View className="bg-surface rounded-lg p-4 border border-border mb-3">
        <Text className="text-muted text-sm">MiniMax M2.5 powered analysis</Text>
      </View>
      <View className="bg-surface rounded-lg p-4 border border-border">
        <Text className="text-secondary text-base">News sentiment, technical analysis, and investment recommendations will appear here.</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <PagerView style={{ flex: 1 }} initialPage={0}>
      <View key="0" style={{ flex: 1 }}>
        <WatchlistPage />
      </View>
      <View key="1" style={{ flex: 1 }}>
        <AnalysisPage />
      </View>
    </PagerView>
  );
}

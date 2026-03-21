import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import ReorderableList, {
  ReorderableListReorderEvent,
  useReorderableDrag,
} from 'react-native-reorderable-list';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import PagerView from 'react-native-pager-view';
import { AlertsListModal } from '../features/alerts/components/AlertsListModal';
import { useAlertStore } from '../features/alerts/store/alertStore';
import { AnalysisScreen } from '../features/analysis/components/AnalysisScreen';
import { SummaryScreen } from '../features/summary/components/SummaryScreen';
import { MarketStatusBar } from '../features/market/MarketStatusBar';
import { useQuoteStore } from '../features/market/quoteStore';
import { EmptyWatchlist } from '../features/watchlist/components/EmptyWatchlist';
import { SearchModal } from '../features/watchlist/components/SearchModal';
import { StockCard } from '../features/watchlist/components/StockCard';
import { WatchlistItem, useWatchlistStore } from '../features/watchlist/store/watchlistStore';

function SwipeableCard({ item }: { item: WatchlistItem }) {
  const router = useRouter();
  const quotes = useQuoteStore(s => s.quotes);
  const drag = useReorderableDrag();

  function renderRightActions() {
    return (
      <View className="bg-stock-down justify-center items-center w-20 rounded-r-lg mb-2">
        <Text className="text-bg font-semibold text-base">Delete</Text>
      </View>
    );
  }

  function handleSwipeableOpen() {
    useWatchlistStore.getState().removeItem(item.id);
  }

  return (
    <ReanimatedSwipeable
      renderRightActions={renderRightActions}
      onSwipeableOpen={handleSwipeableOpen}
      rightThreshold={40}
      friction={2}
    >
      <StockCard
        item={item}
        quote={quotes[item.symbol]}
        onPress={() => router.push(`/detail/${item.symbol}`)}
        onLongPress={async () => {
          try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } catch (_) {}
          drag();
        }}
      />
    </ReanimatedSwipeable>
  );
}

function WatchlistPage() {
  const items = useWatchlistStore(s => s.items);
  const [searchVisible, setSearchVisible] = useState(false);
  const [alertsListVisible, setAlertsListVisible] = useState(false);
  const alertCount = useAlertStore(s => s.activeCount());
  const router = useRouter();

  function handleReorder({ from, to }: ReorderableListReorderEvent) {
    useWatchlistStore.getState().reorderItems(from, to);
  }

  function renderItem({ item }: { item: WatchlistItem }) {
    return <SwipeableCard item={item} />;
  }

  return (
    <View className="flex-1 bg-bg px-4 pt-12">
      <View className="mb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Pressable onPress={() => router.push('/settings')} className="mr-3 py-1">
              <View style={{ gap: 4 }}>
                <View style={{ width: 20, height: 2, backgroundColor: '#e0e0e0' }} />
                <View style={{ width: 20, height: 2, backgroundColor: '#e0e0e0' }} />
                <View style={{ width: 20, height: 2, backgroundColor: '#e0e0e0' }} />
              </View>
            </Pressable>
            <Text className="text-text text-2xl font-bold">Watchlist</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable onPress={() => setAlertsListVisible(true)} style={{ position: 'relative' }}>
              <Text style={{ fontSize: 20 }}>🔔</Text>
              {alertCount > 0 ? (
                <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#00e5ff', borderRadius: 8, minWidth: 16, paddingHorizontal: 2, alignItems: 'center' }}>
                  <Text style={{ color: '#050508', fontSize: 10, fontWeight: 'bold' }}>{alertCount}</Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable onPress={() => setSearchVisible(true)}>
              <Text className="text-primary text-base">+ Add</Text>
            </Pressable>
          </View>
        </View>
        <MarketStatusBar />
      </View>

      <AlertsListModal visible={alertsListVisible} onClose={() => setAlertsListVisible(false)} />

      <Pressable
        onPress={() => setSearchVisible(true)}
        className="bg-surface border border-border rounded-lg px-4 py-3 mb-4 flex-row items-center"
      >
        <Text className="text-muted text-base flex-1">Search stocks...</Text>
      </Pressable>

      {items.length === 0 ? (
        <EmptyWatchlist onAddPress={() => setSearchVisible(true)} />
      ) : (
        <ReorderableList
          data={items}
          keyExtractor={item => item.symbol}
          renderItem={renderItem}
          onReorder={handleReorder}
        />
      )}

      <SearchModal visible={searchVisible} onClose={() => setSearchVisible(false)} />
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const pagerRef = useRef<PagerView>(null);
  const [activePage, setActivePage] = useState(1);

  function handlePageSelected(e: { nativeEvent: { position: number } }) {
    const page = e.nativeEvent.position;
    if (page === 0) {
      pagerRef.current?.setPage(1);
      router.push('/settings');
    } else {
      setActivePage(page);
    }
  }

  return (
    <PagerView
      ref={pagerRef}
      style={{ flex: 1 }}
      initialPage={1}
      onPageSelected={handlePageSelected}
    >
      <View key="0" style={{ flex: 1 }} />
      <View key="1" style={{ flex: 1 }}>
        <WatchlistPage />
      </View>
      <View key="2" style={{ flex: 1 }}>
        <AnalysisScreen isActive={activePage === 2} />
      </View>
      <View key="3" style={{ flex: 1 }}>
        <SummaryScreen isActive={activePage === 3} />
      </View>
    </PagerView>
  );
}

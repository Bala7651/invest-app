import '../global.css';
import '../features/alerts/services/alertTask';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { View, Text, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { db } from '../db/client';
import migrations from '../../drizzle/migrations';
import { useAlertStore } from '../features/alerts/store/alertStore';
import { useQuoteStore } from '../features/market/quoteStore';
import { isMarketOpen } from '../features/market/marketHours';
import { useWatchlistStore } from '../features/watchlist/store/watchlistStore';
import { useSettingsStore } from '../features/settings/store/settingsStore';
import { isCatchUpNeeded, getTodayISO, hasSummaryForDate } from '../features/summary/services/summaryService';
import { useSummaryStore } from '../features/summary/store/summaryStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);

  // Hydrate watchlist from SQLite after migration succeeds, then start polling
  useEffect(() => {
    if (!success) return;
    useSettingsStore.getState().loadFromSecureStore();
    useAlertStore.getState().loadFromDb();
    Notifications.setNotificationChannelAsync('price-alerts', {
      name: 'Price Alerts',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
    Notifications.setNotificationChannelAsync('monitoring-status', {
      name: 'Monitoring Status',
      importance: AndroidImportance.LOW,
    });
    useWatchlistStore.getState().loadFromDb().then(() => {
      const symbols = useWatchlistStore.getState().items.map(i => i.symbol);
      if (symbols.length > 0 && isMarketOpen()) {
        useQuoteStore.getState().startPolling(symbols);
      }
      if (isCatchUpNeeded()) {
        const todayISO = getTodayISO();
        hasSummaryForDate(todayISO).then(has => {
          if (!has) {
            const { apiKey, modelName, baseUrl } = useSettingsStore.getState();
            if (apiKey) {
              useSummaryStore.getState().generateToday({ apiKey, modelName, baseUrl });
            }
          }
        });
      }
    });
  }, [success]);

  // Handle foreground/background transitions
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const syms = useWatchlistStore.getState().items.map(i => i.symbol);
      if (state === 'active' && syms.length > 0 && isMarketOpen()) {
        useQuoteStore.getState().startPolling(syms);
      } else if (state === 'background') {
        useQuoteStore.getState().stopPolling();
      }
    });

    return () => {
      sub.remove();
      useQuoteStore.getState().stopPolling();
    };
  }, []);

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-stock-down text-base">
          DB migration failed: {error.message}
        </Text>
      </View>
    );
  }

  if (!success) {
    return <View className="flex-1 bg-bg" />;
  }

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#050508' },
        }}
      />
    </SafeAreaProvider>
  );
}

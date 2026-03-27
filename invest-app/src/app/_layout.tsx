import '../global.css';
import '../features/alerts/services/alertTask';
import * as Notifications from 'expo-notifications';
import * as WebBrowser from 'expo-web-browser';
import { AndroidImportance } from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar, View, Text, AppState, Alert } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
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
import { tFromStore } from '../features/i18n/useI18n';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const FUGLE_API_DOCS_URL = 'https://developer.fugle.tw/docs/key/';

export default function RootLayout() {
  const router = useRouter();
  const { success, error } = useMigrations(db, migrations);
  const settingsLoaded = useSettingsStore(state => state.isLoaded);

  // Hydrate watchlist from SQLite after migration succeeds, then start polling
  useEffect(() => {
    if (!success) return;
    (async () => {
      await useSettingsStore.getState().loadFromSecureStore();
      if (!useSettingsStore.getState().marketDataRecommendationSeen) {
        await useSettingsStore.getState().markMarketDataRecommendationSeen();
        Alert.alert(
          tFromStore('startup.marketDataPromptTitle'),
          tFromStore('startup.marketDataPromptBody'),
          [
            { text: tFromStore('startup.marketDataPromptLater'), style: 'cancel' },
            {
              text: tFromStore('startup.marketDataPromptOpen'),
              onPress: () => {
                void (async () => {
                  try {
                    await WebBrowser.openBrowserAsync(FUGLE_API_DOCS_URL);
                  } finally {
                    router.push({
                      pathname: '/settings',
                      params: { focusMarketData: 'fugle' },
                    });
                  }
                })();
              },
            },
          ]
        );
      }
      await useAlertStore.getState().loadFromDb();

      Notifications.setNotificationChannelAsync('price-alerts', {
        name: tFromStore('startup.notificationChannelAlerts'),
        importance: AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });
      Notifications.setNotificationChannelAsync('monitoring-status', {
        name: tFromStore('startup.notificationChannelMonitoring'),
        importance: AndroidImportance.LOW,
      });

      await useWatchlistStore.getState().loadFromDb();
      const symbols = useWatchlistStore.getState().items.map(i => i.symbol);
      if (symbols.length > 0) {
        await useQuoteStore.getState().loadPersistedQuotes(symbols);
        useQuoteStore.getState().forceRefresh(symbols);
        if (isMarketOpen()) {
          useQuoteStore.getState().startPolling(symbols);
        }
      }
      if (isCatchUpNeeded()) {
        const todayISO = getTodayISO();
        const has = await hasSummaryForDate(todayISO);
        if (!has) {
          const { apiKey, modelName, baseUrl } = useSettingsStore.getState().getActiveAiCredentials();
          if (apiKey) {
            useSummaryStore.getState().generateToday({ apiKey, modelName, baseUrl });
          }
        }
      }
    })();
  }, [success]);

  // Handle foreground/background transitions
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const syms = useWatchlistStore.getState().items.map(i => i.symbol);
      if (state === 'active' && syms.length > 0) {
        useQuoteStore.getState().forceRefresh(syms);
        if (isMarketOpen()) {
          useQuoteStore.getState().startPolling(syms);
        }
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
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <View className="flex-1 items-center justify-center bg-bg">
          <Text className="text-stock-down text-base">
            DB migration failed: {error.message}
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  if (!success || !settingsLoaded) {
    return (
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <View className="flex-1 bg-bg" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#050508' },
        }}
      />
    </SafeAreaProvider>
  );
}

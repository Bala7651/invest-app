import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import * as alertService from './alertService';

export interface QuoteLike {
  symbol: string;
  name: string;
  price: number | null;
}

async function fireAlertNotification(
  name: string,
  direction: 'upper' | 'lower',
  targetPrice: number,
  currentPrice: number
): Promise<void> {
  const directionLabel = direction === 'upper' ? 'above' : 'below';
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${name} price alert`,
      body: `${name} crossed ${directionLabel} ${targetPrice} - current: ${currentPrice.toFixed(2)}`,
    },
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      channelId: 'price-alerts',
    },
  });
}

export async function checkAlerts(
  quotes: Record<string, QuoteLike>
): Promise<void> {
  const alerts = await alertService.getAll();

  for (const alert of alerts) {
    const quote = quotes[alert.symbol];
    if (!quote || quote.price === null) continue;

    const price = quote.price;

    if (
      alert.upper_price !== null &&
      alert.upper_status === 'active' &&
      price >= alert.upper_price
    ) {
      await alertService.markTriggered(alert.symbol, 'upper');
      await fireAlertNotification(alert.name, 'upper', alert.upper_price, price);
    }

    if (
      alert.lower_price !== null &&
      alert.lower_status === 'active' &&
      price <= alert.lower_price
    ) {
      await alertService.markTriggered(alert.symbol, 'lower');
      await fireAlertNotification(alert.name, 'lower', alert.lower_price, price);
    }
  }
}

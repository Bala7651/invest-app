import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { isMarketOpen } from '../../market/marketHours';
import { getAll } from './alertService';
import { checkAlerts } from './alertMonitor';
import { getQuotes } from '../../../services/stockService';

export const ALERT_CHECK_TASK = 'PRICE_ALERT_CHECK';

TaskManager.defineTask(ALERT_CHECK_TASK, async () => {
  try {
    if (!isMarketOpen()) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const alerts = await getAll();
    const activeAlerts = alerts.filter(
      a => a.upper_status === 'active' || a.lower_status === 'active'
    );

    if (activeAlerts.length === 0) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const symbols = [...new Set(activeAlerts.map(a => a.symbol))];
    const rawQuotes = await getQuotes(symbols);

    const quotesMap: Record<string, { symbol: string; name: string; price: number | null }> = {};
    for (const q of rawQuotes) {
      quotesMap[q.symbol] = { symbol: q.symbol, name: q.name, price: q.price };
    }

    await checkAlerts(quotesMap);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerAlertTask(): Promise<void> {
  const status = await BackgroundTask.getStatusAsync();
  if (status === BackgroundTask.BackgroundTaskStatus.Available) {
    await BackgroundTask.registerTaskAsync(ALERT_CHECK_TASK, {
      minimumInterval: 15,
    });
  }
}

export async function unregisterAlertTask(): Promise<void> {
  await BackgroundTask.unregisterTaskAsync(ALERT_CHECK_TASK);
}

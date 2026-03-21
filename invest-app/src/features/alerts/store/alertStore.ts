import * as Notifications from 'expo-notifications';
import { create } from 'zustand';
import * as alertService from '../services/alertService';
import type { AlertRow } from '../services/alertService';
import { registerAlertTask, unregisterAlertTask } from '../services/alertTask';

const MONITORING_NOTIFICATION_ID = 'monitoring-status-persistent';

async function updateMonitoringNotification(count: number): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: MONITORING_NOTIFICATION_ID,
    content: {
      title: 'Price Alerts',
      body: `Monitoring ${count} alert${count === 1 ? '' : 's'}`,
      sticky: true,
    },
    trigger: null,
  });
}

async function dismissMonitoringNotification(): Promise<void> {
  await Notifications.dismissNotificationAsync(MONITORING_NOTIFICATION_ID);
}

interface AlertState {
  alerts: AlertRow[];
  loadFromDb: () => Promise<void>;
  upsertAlert: (
    symbol: string,
    name: string,
    upper: number | null,
    lower: number | null
  ) => Promise<void>;
  deleteAlert: (id: number) => Promise<void>;
  reEnable: (symbol: string, direction: 'upper' | 'lower') => Promise<void>;
  getBySymbol: (symbol: string) => AlertRow | undefined;
  activeCount: () => number;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],

  async loadFromDb() {
    const rows = await alertService.getAll();
    set({ alerts: rows });
  },

  async upsertAlert(symbol, name, upper, lower) {
    await alertService.upsertAlert(symbol, name, upper, lower);
    const existing = get().alerts.filter(a => a.symbol !== symbol);
    const fresh = await alertService.getAll();
    const newRow = fresh.find(a => a.symbol === symbol);
    const updated = newRow ? [...existing, newRow] : existing;
    set({ alerts: updated });

    const active = updated.filter(
      a => a.upper_status === 'active' || a.lower_status === 'active'
    );
    if (active.length > 0) {
      await registerAlertTask();
      await updateMonitoringNotification(active.length);
    }
  },

  async deleteAlert(id) {
    await alertService.deleteAlert(id);
    const updated = get().alerts.filter(a => a.id !== id);
    set({ alerts: updated });

    const active = updated.filter(
      a => a.upper_status === 'active' || a.lower_status === 'active'
    );
    if (updated.length === 0) {
      await unregisterAlertTask();
      await dismissMonitoringNotification();
    } else if (active.length === 0) {
      await dismissMonitoringNotification();
    } else {
      await updateMonitoringNotification(active.length);
    }
  },

  async reEnable(symbol, direction) {
    await alertService.reEnableDirection(symbol, direction);
    await get().loadFromDb();
    const alerts = get().alerts;
    const active = alerts.filter(
      a => a.upper_status === 'active' || a.lower_status === 'active'
    );
    if (active.length > 0) {
      await registerAlertTask();
      await updateMonitoringNotification(active.length);
    }
  },

  getBySymbol(symbol) {
    return get().alerts.find(a => a.symbol === symbol);
  },

  activeCount() {
    return get().alerts.filter(
      a => a.upper_status === 'active' || a.lower_status === 'active'
    ).length;
  },
}));

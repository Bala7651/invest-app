import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import * as alertService from './alertService';
import { useSettingsStore } from '../../settings/store/settingsStore';

export interface QuoteLike {
  symbol: string;
  name: string;
  price: number | null;
}

interface AlertCredentials {
  apiKey: string;
  modelName: string;
  baseUrl: string;
}

async function getAlertContext(
  name: string,
  direction: 'upper' | 'lower',
  targetPrice: number,
  currentPrice: number,
  credentials: AlertCredentials
): Promise<string | null> {
  const directionZh = direction === 'upper' ? '向上突破' : '向下跌破';
  const prompt = `${name}股價${directionZh}${targetPrice}元（現價${currentPrice}元）。請用一句話（不超過40個中文字）說明當前市場背景，語氣客觀，禁止投資建議。`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5_000);

  try {
    const endpoint = `${credentials.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credentials.apiKey}`,
      },
      body: JSON.stringify({
        model: credentials.modelName,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 80,
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    // Strip <think> tags (same pattern as parseAnalysisResponse)
    const stripped = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    return stripped.length > 0 ? stripped : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fireAlertNotification(
  name: string,
  direction: 'upper' | 'lower',
  targetPrice: number,
  currentPrice: number,
  aiContext?: string
): Promise<void> {
  const directionLabel = direction === 'upper' ? 'above' : 'below';
  const plainBody = `${name} crossed ${directionLabel} ${targetPrice} - current: ${currentPrice.toFixed(2)}`;
  const body = aiContext && aiContext.length > 0 ? `${plainBody} | ${aiContext}` : plainBody;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${name} price alert`,
      body,
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
      const { aiNotificationsEnabled, apiKey, modelName, baseUrl } = useSettingsStore.getState();
      let aiContext: string | undefined;
      if (aiNotificationsEnabled && apiKey !== '') {
        aiContext = await getAlertContext(alert.name, 'upper', alert.upper_price, price, { apiKey, modelName, baseUrl }) ?? undefined;
      }
      await fireAlertNotification(alert.name, 'upper', alert.upper_price, price, aiContext);
    }

    if (
      alert.lower_price !== null &&
      alert.lower_status === 'active' &&
      price <= alert.lower_price
    ) {
      await alertService.markTriggered(alert.symbol, 'lower');
      const { aiNotificationsEnabled, apiKey, modelName, baseUrl } = useSettingsStore.getState();
      let aiContext: string | undefined;
      if (aiNotificationsEnabled && apiKey !== '') {
        aiContext = await getAlertContext(alert.name, 'lower', alert.lower_price, price, { apiKey, modelName, baseUrl }) ?? undefined;
      }
      await fireAlertNotification(alert.name, 'lower', alert.lower_price, price, aiContext);
    }
  }
}

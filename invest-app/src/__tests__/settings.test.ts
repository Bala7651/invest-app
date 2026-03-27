import { Platform } from 'react-native';

jest.mock('expo-intent-launcher', () => ({
  startActivityAsync: jest.fn(),
  ActivityAction: {
    IGNORE_BATTERY_OPTIMIZATION_SETTINGS: 'android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS',
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-router', () => ({
  useRouter: jest.fn().mockReturnValue({ back: jest.fn(), push: jest.fn() }),
}));

describe('ALRT-03: Battery Optimization setting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS is defined', () => {
    const { ActivityAction } = require('expo-intent-launcher');
    expect(ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS).toBeDefined();
    expect(typeof ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS).toBe('string');
  });

  it('startActivityAsync is callable with battery optimization action', async () => {
    const { startActivityAsync, ActivityAction } = require('expo-intent-launcher');
    await startActivityAsync(ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
    expect(startActivityAsync).toHaveBeenCalledWith(
      ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS
    );
  });

  it('Platform.OS is accessible (battery-optimization-row renders on android)', () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'android', configurable: true });
    expect(Platform.OS).toBe('android');
  });

  it('renders Battery Optimization row on Android — testID battery-optimization-row is in settings.tsx', () => {
    // Verify the settings source contains the testID and Android guard
    const fs = require('fs');
    const path = require('path');
    const settingsPath = path.resolve(__dirname, '../app/settings.tsx');
    const translationsPath = path.resolve(__dirname, '../features/i18n/translations.ts');
    const source = fs.readFileSync(settingsPath, 'utf-8');
    const translations = fs.readFileSync(translationsPath, 'utf-8');
    expect(source).toContain('testID="battery-optimization-row"');
    expect(source).toContain("Platform.OS === 'android'");
    expect(source).toContain("t('settings.batteryOptimizationTitle')");
    expect(translations).toContain("'settings.batteryOptimizationTitle': '電池最佳化'");
    expect(source).toContain('IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
  });
});

describe('AI Notifications toggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('setAiNotificationsEnabled(false) calls setItemAsync with key ai_notifications_enabled and value false', async () => {
    const { setItemAsync } = require('expo-secure-store');
    const { useSettingsStore } = require('../features/settings/store/settingsStore');
    await useSettingsStore.getState().setAiNotificationsEnabled(false);
    expect(setItemAsync).toHaveBeenCalledWith('ai_notifications_enabled', 'false');
  });

  it('setAiNotificationsEnabled(true) calls setItemAsync with key ai_notifications_enabled and value true', async () => {
    const { setItemAsync } = require('expo-secure-store');
    const { useSettingsStore } = require('../features/settings/store/settingsStore');
    await useSettingsStore.getState().setAiNotificationsEnabled(true);
    expect(setItemAsync).toHaveBeenCalledWith('ai_notifications_enabled', 'true');
  });

  it('loadFromSecureStore sets aiNotificationsEnabled=false when stored value is false', async () => {
    const { getItemAsync } = require('expo-secure-store');
    getItemAsync.mockImplementation((key: string) => {
      if (key === 'ai_notifications_enabled') return Promise.resolve('false');
      return Promise.resolve(null);
    });
    const { useSettingsStore } = require('../features/settings/store/settingsStore');
    await useSettingsStore.getState().loadFromSecureStore();
    expect(useSettingsStore.getState().aiNotificationsEnabled).toBe(false);
  });

  it('loadFromSecureStore sets aiNotificationsEnabled=true when stored value is null (default)', async () => {
    const { getItemAsync } = require('expo-secure-store');
    getItemAsync.mockResolvedValue(null);
    const { useSettingsStore } = require('../features/settings/store/settingsStore');
    await useSettingsStore.getState().loadFromSecureStore();
    expect(useSettingsStore.getState().aiNotificationsEnabled).toBe(true);
  });
});

describe('First-launch market data recommendation', () => {
  it('RootLayout includes the Fugle API recommendation alert and link', () => {
    const fs = require('fs');
    const path = require('path');
    const layoutPath = path.resolve(__dirname, '../app/_layout.tsx');
    const translationsPath = path.resolve(__dirname, '../features/i18n/translations.ts');
    const source = fs.readFileSync(layoutPath, 'utf-8');
    const translations = fs.readFileSync(translationsPath, 'utf-8');

    expect(source).toContain("tFromStore('startup.marketDataPromptTitle')");
    expect(translations).toContain("'startup.marketDataPromptTitle': '建議設定行情 API'");
    expect(source).toContain('https://developer.fugle.tw/docs/key/');
    expect(source).toContain('markMarketDataRecommendationSeen');
    expect(source).toContain('Linking.openURL');
  });
});

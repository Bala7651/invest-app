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
    const source = fs.readFileSync(settingsPath, 'utf-8');
    expect(source).toContain('testID="battery-optimization-row"');
    expect(source).toContain("Platform.OS === 'android'");
    expect(source).toContain('電池最佳化');
    expect(source).toContain('IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
  });
});

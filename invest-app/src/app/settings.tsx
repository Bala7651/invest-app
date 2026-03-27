import { startActivityAsync, ActivityAction } from 'expo-intent-launcher';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, PanResponder, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ApiKeyInput } from '../features/settings/components/ApiKeyInput';
import { AlphaVantageApiKeyInput } from '../features/settings/components/AlphaVantageApiKeyInput';
import { FugleApiKeyInput } from '../features/settings/components/FugleApiKeyInput';
import { GlowPillSelector } from '../features/settings/components/GlowPillSelector';
import { ALPHA_VANTAGE_DAILY_QUOTA, useSettingsStore } from '../features/settings/store/settingsStore';
import { AI_PROVIDERS, MARKET_DATA_PROVIDERS } from '../features/settings/constants/providers';
import { useWatchlistStore } from '../features/watchlist/store/watchlistStore';
import { useQuoteStore } from '../features/market/quoteStore';
import { isMarketOpen } from '../features/market/marketHours';
import { useI18n } from '../features/i18n/useI18n';
import type { AppLanguage } from '../features/i18n/types';

function DropdownSelect({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View className="mt-4">
      <Text className="text-muted text-xs mb-1">{label}</Text>
      <Pressable
        onPress={() => setOpen(!open)}
        style={{
          backgroundColor: '#050508',
          borderWidth: 1,
          borderColor: open ? '#4D7CFF' : '#2a2a3a',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#e0e0e0', fontSize: 15 }}>{value}</Text>
        <Text style={{ color: '#888', fontSize: 12 }}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open && (
        <View style={{ backgroundColor: '#0d0d14', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 8, marginTop: 4, overflow: 'hidden' }}>
          {options.map(opt => (
            <Pressable
              key={opt}
              onPress={() => { onSelect(opt); setOpen(false); }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: opt === value ? 'rgba(77,124,255,0.15)' : 'transparent',
                borderBottomWidth: 1,
                borderBottomColor: '#1a1a2a',
              }}
            >
              <Text style={{ color: opt === value ? '#4D7CFF' : '#e0e0e0', fontSize: 15 }}>{opt}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { t, language } = useI18n();
  const providerName = useSettingsStore(s => s.providerName);
  const modelName = useSettingsStore(s => s.modelName);
  const glowLevel = useSettingsStore(s => s.glowLevel);
  const setModelName = useSettingsStore(s => s.setModelName);
  const setProvider = useSettingsStore(s => s.setProvider);
  const setGlowLevel = useSettingsStore(s => s.setGlowLevel);
  const aiNotificationsEnabled = useSettingsStore(s => s.aiNotificationsEnabled);
  const setAiNotificationsEnabled = useSettingsStore(s => s.setAiNotificationsEnabled);
  const marketDataProvider = useSettingsStore(s => s.marketDataProvider);
  const setMarketDataProvider = useSettingsStore(s => s.setMarketDataProvider);
  const alphaVantageEnabled = useSettingsStore(s => s.alphaVantageEnabled);
  const alphaVantageDailyRemaining = useSettingsStore(s => s.alphaVantageDailyRemaining);
  const setAlphaVantageEnabled = useSettingsStore(s => s.setAlphaVantageEnabled);
  const fugleEnabled = useSettingsStore(s => s.fugleEnabled);
  const setFugleEnabled = useSettingsStore(s => s.setFugleEnabled);
  const setLanguage = useSettingsStore(s => s.setLanguage);

  const currentProvider = AI_PROVIDERS.find(p => p.name === providerName) ?? AI_PROVIDERS[0];
  const currentMarketDataProvider =
    MARKET_DATA_PROVIDERS.find(p => p.id === marketDataProvider) ?? MARKET_DATA_PROVIDERS[0];
  const activeConfigLabel = `${providerName} / ${modelName}`;

  function getMarketDataProviderLabel(id: typeof currentMarketDataProvider.id) {
    return t(`settings.providerLabel.${id}`);
  }

  function getMarketDataProviderDescription(id: typeof currentMarketDataProvider.id) {
    return t(`settings.providerDescription.${id}`);
  }

  function handleProviderSelect(name: string) {
    const provider = AI_PROVIDERS.find(p => p.name === name);
    if (provider) {
      setProvider(name, provider.baseUrl, provider.models[0]);
    }
  }

  function handleModelSelect(model: string) {
    setModelName(model);
  }

  function handleMarketDataProviderSelect(label: string) {
    const provider = MARKET_DATA_PROVIDERS.find(p => getMarketDataProviderLabel(p.id) === label);
    if (provider) {
      setMarketDataProvider(provider.id);
    }
  }

  function handleLanguageSelect(nextLanguageLabel: string) {
    const nextLanguage: AppLanguage =
      nextLanguageLabel === t('language.name.en') ? 'en' : 'zh-TW';
    void setLanguage(nextLanguage);
  }

  async function restartQuotePipeline() {
    const symbols = useWatchlistStore.getState().items.map(item => item.symbol);
    const quoteStore = useQuoteStore.getState();
    quoteStore.stopPolling();
    if (symbols.length === 0) return;
    await quoteStore.forceRefresh(symbols);
    if (isMarketOpen()) {
      quoteStore.startPolling(symbols);
    }
  }

  async function handleAlphaVantageToggle(value: boolean) {
    if (value) {
      Alert.alert(
        t('settings.alphaToggleTitle'),
        t('settings.alphaToggleBody')
      );
      await setAlphaVantageEnabled(true);
      await setMarketDataProvider('alpha_vantage');
    } else {
      await setAlphaVantageEnabled(false);
      if (useSettingsStore.getState().marketDataProvider === 'alpha_vantage') {
        await setMarketDataProvider(useSettingsStore.getState().fugleEnabled ? 'fugle' : 'twse_yahoo');
      }
    }
    await restartQuotePipeline();
  }

  async function handleFugleToggle(value: boolean) {
    if (value) {
      Alert.alert(
        t('settings.fugleToggleTitle'),
        t('settings.fugleToggleBody')
      );
      await setFugleEnabled(true);
      await setMarketDataProvider('fugle');
    } else {
      await setFugleEnabled(false);
      if (useSettingsStore.getState().marketDataProvider === 'fugle') {
        await setMarketDataProvider(useSettingsStore.getState().alphaVantageEnabled ? 'alpha_vantage' : 'twse_yahoo');
      }
    }
    await restartQuotePipeline();
  }

  function handleBack() {
    router.back();
  }

  const swipeBackResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dx < -18 &&
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -120 || (gestureState.dx < -80 && gestureState.vx < -0.25)) {
          handleBack();
        }
      },
    })
  ).current;

  return (
    <View style={{ flex: 1 }} {...swipeBackResponder.panHandlers}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, paddingTop: 52, paddingBottom: 24 }}>
          <View className="flex-row items-center mb-6">
            <Pressable onPress={handleBack} className="mr-4">
              <Text className="text-primary text-base">{t('common.back')}</Text>
            </Pressable>
            <Text className="text-text text-2xl font-bold">{t('settings.title')}</Text>
          </View>

          <Text className="text-muted text-xs uppercase tracking-widest mb-3">{t('settings.section.api')}</Text>
          <View className="bg-surface border border-border rounded-lg p-4 mb-4">
            <View className="bg-bg border border-border rounded-lg px-3 py-3 mb-4">
              <Text className="text-muted text-xs">{t('settings.activeConfig')}</Text>
              <Text className="text-text text-base mt-1">{activeConfigLabel}</Text>
              <Text className="text-muted text-xs mt-1">
                {t('settings.activeConfigHint')}
              </Text>
            </View>

            <Text className="text-muted text-xs mb-1">{providerName} API Key</Text>
            <ApiKeyInput />

            <DropdownSelect
              label={t('settings.aiProvider')}
              value={providerName}
              options={AI_PROVIDERS.map(p => p.name)}
              onSelect={handleProviderSelect}
            />

            <DropdownSelect
              label={t('settings.aiModel')}
              value={modelName}
              options={currentProvider.models}
              onSelect={handleModelSelect}
            />
          </View>

          <Text className="text-muted text-xs uppercase tracking-widest mb-3">{t('settings.section.marketData')}</Text>
          <View className="bg-surface border border-border rounded-lg p-4 mb-4">
            <DropdownSelect
              label={t('settings.marketDataProvider')}
              value={getMarketDataProviderLabel(currentMarketDataProvider.id)}
              options={MARKET_DATA_PROVIDERS.map(p => getMarketDataProviderLabel(p.id))}
              onSelect={handleMarketDataProviderSelect}
            />

            <Text className="text-muted text-xs mt-3">
              {getMarketDataProviderDescription(currentMarketDataProvider.id)}
            </Text>

            {marketDataProvider === 'alpha_vantage' ? (
              <View className="mt-4">
                <Text className="text-muted text-xs mb-1">Alpha Vantage API Key</Text>
                <AlphaVantageApiKeyInput />
                <View className="mt-4 flex-row items-center justify-between">
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text className="text-text text-base">{t('settings.alphaEnabledTitle')}</Text>
                    <Text className="text-muted text-xs mt-1">{t('settings.alphaEnabledDescription')}</Text>
                  </View>
                  <Switch
                    value={alphaVantageEnabled}
                    onValueChange={handleAlphaVantageToggle}
                    trackColor={{ false: '#2a2a3a', true: '#4D7CFF' }}
                    thumbColor={alphaVantageEnabled ? '#fff' : '#888'}
                  />
                </View>
                <View className="mt-3 bg-bg border border-border rounded-lg px-3 py-3">
                  <Text className="text-text text-sm">{t('settings.alphaQuotaTitle')}</Text>
                  <Text className="text-primary text-lg font-semibold mt-1">
                    {alphaVantageDailyRemaining}/{ALPHA_VANTAGE_DAILY_QUOTA}
                  </Text>
                  <Text className="text-muted text-xs mt-1">
                    {t('settings.alphaQuotaDescription')}
                  </Text>
                </View>
                <Text className="text-muted text-xs mt-2">
                  {t('settings.alphaFallbackNote')}
                </Text>
              </View>
            ) : null}

            {marketDataProvider === 'fugle' ? (
              <View className="mt-4">
                <Text className="text-muted text-xs mb-1">Fugle API Key</Text>
                <FugleApiKeyInput />
                <View className="mt-4 flex-row items-center justify-between">
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text className="text-text text-base">{t('settings.fugleEnabledTitle')}</Text>
                    <Text className="text-muted text-xs mt-1">{t('settings.fugleEnabledDescription')}</Text>
                  </View>
                  <Switch
                    value={fugleEnabled}
                    onValueChange={handleFugleToggle}
                    trackColor={{ false: '#2a2a3a', true: '#4D7CFF' }}
                    thumbColor={fugleEnabled ? '#fff' : '#888'}
                  />
                </View>
                <Text className="text-muted text-xs mt-2">
                  {t('settings.fugleFallbackNote')}
                </Text>
              </View>
            ) : null}
          </View>

          <Text className="text-muted text-xs uppercase tracking-widest mb-3">{t('settings.section.language')}</Text>
          <View className="bg-surface border border-border rounded-lg p-4 mb-4">
            <DropdownSelect
              label={t('settings.language')}
              value={t(`language.name.${language}`)}
              options={[t('language.name.zh-TW'), t('language.name.en')]}
              onSelect={handleLanguageSelect}
            />
            <Text className="text-muted text-xs mt-3">{t('settings.languageHint')}</Text>
          </View>

          <Text className="text-muted text-xs uppercase tracking-widest mb-3">{t('settings.section.display')}</Text>
          <View className="bg-surface border border-border rounded-lg p-4 mb-4">
            <Text className="text-muted text-xs mb-3">{t('settings.displayGlow')}</Text>
            <GlowPillSelector
              active={glowLevel}
              onSelect={setGlowLevel}
            />
          </View>

          <Text className="text-muted text-xs uppercase tracking-widest mb-3">{t('settings.section.alerts')}</Text>
          <View className="bg-surface border border-border rounded-lg mb-4">
            <View testID="ai-notifications-toggle" className="p-4 flex-row items-center justify-between">
              <View style={{ flex: 1 }}>
                <Text className="text-text text-base">{t('settings.aiNotificationsTitle')}</Text>
                <Text className="text-muted text-xs mt-1">{t('settings.aiNotificationsDescription')}</Text>
              </View>
              <Switch
                value={aiNotificationsEnabled}
                onValueChange={(v) => setAiNotificationsEnabled(v)}
                trackColor={{ false: '#2a2a3a', true: '#4D7CFF' }}
                thumbColor={aiNotificationsEnabled ? '#fff' : '#888'}
              />
            </View>

            {/* Battery optimization row — Android only */}
            {Platform.OS === 'android' ? (
              <>
                <View style={{ height: 1, backgroundColor: '#2a2a3a' }} />
                <Pressable
                  testID="battery-optimization-row"
                  onPress={() => startActivityAsync(ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS)}
                  className="p-4"
                >
                  <View className="flex-row items-center justify-between">
                    <View style={{ flex: 1 }}>
                      <Text className="text-text text-base">{t('settings.batteryOptimizationTitle')}</Text>
                      <Text className="text-muted text-xs mt-1">{t('settings.batteryOptimizationDescription')}</Text>
                    </View>
                    <Text className="text-primary text-sm">{t('settings.openSettings')}</Text>
                  </View>
                </Pressable>
              </>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

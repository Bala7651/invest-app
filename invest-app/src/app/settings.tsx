import { startActivityAsync, ActivityAction } from 'expo-intent-launcher';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, PanResponder, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ApiKeyInput } from '../features/settings/components/ApiKeyInput';
import { AlphaVantageApiKeyInput } from '../features/settings/components/AlphaVantageApiKeyInput';
import { GlowPillSelector } from '../features/settings/components/GlowPillSelector';
import { ALPHA_VANTAGE_DAILY_QUOTA, useSettingsStore } from '../features/settings/store/settingsStore';
import { AI_PROVIDERS, MARKET_DATA_PROVIDERS } from '../features/settings/constants/providers';

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

  const currentProvider = AI_PROVIDERS.find(p => p.name === providerName) ?? AI_PROVIDERS[0];
  const currentMarketDataProvider =
    MARKET_DATA_PROVIDERS.find(p => p.id === marketDataProvider) ?? MARKET_DATA_PROVIDERS[0];
  const activeConfigLabel = `${providerName} / ${modelName}`;

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
    const provider = MARKET_DATA_PROVIDERS.find(p => p.label === label);
    if (provider) {
      setMarketDataProvider(provider.id);
    }
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
              <Text className="text-primary text-base">返回</Text>
            </Pressable>
            <Text className="text-text text-2xl font-bold">設定</Text>
          </View>

          {/* API 設定 */}
          <Text className="text-muted text-xs uppercase tracking-widest mb-3">API 設定</Text>
          <View className="bg-surface border border-border rounded-lg p-4 mb-4">
            <View className="bg-bg border border-border rounded-lg px-3 py-3 mb-4">
              <Text className="text-muted text-xs">目前實際使用</Text>
              <Text className="text-text text-base mt-1">{activeConfigLabel}</Text>
              <Text className="text-muted text-xs mt-1">
                每個 AI 供應商各自保存 API 金鑰，切換供應商時會自動帶入對應金鑰。
              </Text>
            </View>

            <Text className="text-muted text-xs mb-1">{providerName} API 金鑰</Text>
            <ApiKeyInput />

            <DropdownSelect
              label="AI 供應商"
              value={providerName}
              options={AI_PROVIDERS.map(p => p.name)}
              onSelect={handleProviderSelect}
            />

            <DropdownSelect
              label="AI 模型"
              value={modelName}
              options={currentProvider.models}
              onSelect={handleModelSelect}
            />
          </View>

          <Text className="text-muted text-xs uppercase tracking-widest mb-3">行情資料</Text>
          <View className="bg-surface border border-border rounded-lg p-4 mb-4">
            <DropdownSelect
              label="市場資料供應商"
              value={currentMarketDataProvider.label}
              options={MARKET_DATA_PROVIDERS.map(p => p.label)}
              onSelect={handleMarketDataProviderSelect}
            />

            <Text className="text-muted text-xs mt-3">
              {currentMarketDataProvider.description}
            </Text>

            {marketDataProvider === 'alpha_vantage' ? (
              <View className="mt-4">
                <Text className="text-muted text-xs mb-1">Alpha Vantage API 金鑰</Text>
                <AlphaVantageApiKeyInput />
                <View className="mt-4 flex-row items-center justify-between">
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text className="text-text text-base">啟用 Alpha Vantage</Text>
                    <Text className="text-muted text-xs mt-1">開啟後會在需要時使用 Alpha Vantage 補報價，手動下拉刷新也會主動檢查一次。</Text>
                  </View>
                  <Switch
                    value={alphaVantageEnabled}
                    onValueChange={(value) => setAlphaVantageEnabled(value)}
                    trackColor={{ false: '#2a2a3a', true: '#4D7CFF' }}
                    thumbColor={alphaVantageEnabled ? '#fff' : '#888'}
                  />
                </View>
                <View className="mt-3 bg-bg border border-border rounded-lg px-3 py-3">
                  <Text className="text-text text-sm">今日 Alpha Vantage 額度</Text>
                  <Text className="text-primary text-lg font-semibold mt-1">
                    {alphaVantageDailyRemaining}/{ALPHA_VANTAGE_DAILY_QUOTA}
                  </Text>
                  <Text className="text-muted text-xs mt-1">
                    以實際 Alpha Vantage HTTP 請求數計算，每日重置；更換 API 金鑰也會重置。
                  </Text>
                </View>
                <Text className="text-muted text-xs mt-2">
                  只作為穩定報價 fallback，若 Alpha Vantage 沒有台股資料仍會回退到 TWSE / Yahoo。
                </Text>
              </View>
            ) : null}
          </View>

          {/* Display section */}
          <Text className="text-muted text-xs uppercase tracking-widest mb-3">顯示</Text>
          <View className="bg-surface border border-border rounded-lg p-4 mb-4">
            <Text className="text-muted text-xs mb-3">光暈強度</Text>
            <GlowPillSelector
              active={glowLevel}
              onSelect={setGlowLevel}
            />
          </View>

          {/* Alerts section */}
          <Text className="text-muted text-xs uppercase tracking-widest mb-3">提醒</Text>
          <View className="bg-surface border border-border rounded-lg mb-4">
            {/* AI notifications toggle — renders on all platforms */}
            <View testID="ai-notifications-toggle" className="p-4 flex-row items-center justify-between">
              <View style={{ flex: 1 }}>
                <Text className="text-text text-base">AI 通知內容</Text>
                <Text className="text-muted text-xs mt-1">價格提醒觸發時附加 AI 市場背景說明</Text>
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
                      <Text className="text-text text-base">電池最佳化</Text>
                      <Text className="text-muted text-xs mt-1">關閉以確保背景價格提醒正常運作</Text>
                    </View>
                    <Text className="text-primary text-sm">開啟設定</Text>
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

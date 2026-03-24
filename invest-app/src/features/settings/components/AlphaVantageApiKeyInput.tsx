import { useRef, useState } from 'react';
import { Alert, Animated, Pressable, Text, TextInput, View } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { resetAlphaVantageCache } from '../../../services/stockService';

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 4) return key;
  return '........' + key.slice(-4);
}

function isAlphaVantageRateLimitMessage(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const normalized = value.toLowerCase();
  return normalized.includes('alpha vantage') && normalized.includes('limit');
}

export function AlphaVantageApiKeyInput() {
  const apiKey = useSettingsStore(s => s.alphaVantageApiKey);
  const saveApiKey = useSettingsStore(s => s.saveAlphaVantageApiKey);
  const deleteApiKey = useSettingsStore(s => s.deleteAlphaVantageApiKey);
  const recordAlphaVantageRequest = useSettingsStore(s => s.recordAlphaVantageRequest);
  const markAlphaVantageLimitReached = useSettingsStore(s => s.markAlphaVantageLimitReached);
  const ensureAlphaVantageQuotaCurrent = useSettingsStore(s => s.ensureAlphaVantageQuotaCurrent);

  const [isRevealed, setIsRevealed] = useState(false);
  const [inputValue, setInputValue] = useState(apiKey);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  function showSavedToast() {
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.delay(1000),
      Animated.timing(toastOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }

  async function handleBlur() {
    setIsFocused(false);
    await saveApiKey(inputValue);
    resetAlphaVantageCache();
    showSavedToast();
  }

  async function handleTest() {
    if (!inputValue) return;
    await ensureAlphaVantageQuotaCurrent();
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=TSM&apikey=${encodeURIComponent(inputValue)}`
      );
      const data = await res.json();
      await recordAlphaVantageRequest();
      if (isAlphaVantageRateLimitMessage(data?.Information) || isAlphaVantageRateLimitMessage(data?.Note)) {
        await markAlphaVantageLimitReached();
      }
      const quote = data['Global Quote'];
      setTestResult(quote && Object.keys(quote).length > 0 ? 'success' : 'error');
    } catch {
      setTestResult('error');
    } finally {
      setIsTesting(false);
    }
  }

  function handleClear() {
    Alert.alert(
      '清除 Alpha Vantage 金鑰',
      '確定要刪除 Alpha Vantage API 金鑰嗎？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除',
          style: 'destructive',
          onPress: async () => {
            await deleteApiKey();
            resetAlphaVantageCache();
            setInputValue('');
            setTestResult(null);
          },
        },
      ]
    );
  }

  const displayValue = isFocused ? inputValue : (apiKey ? maskKey(apiKey) : '');

  return (
    <View>
      <Animated.View
        style={{ position: 'absolute', top: -28, left: 0, right: 0, opacity: toastOpacity, zIndex: 10 }}
        pointerEvents="none"
      >
        <Text className="text-primary text-xs text-center">已儲存</Text>
      </Animated.View>

      <View
        className={`bg-surface border rounded-lg px-3 py-2 mb-2 flex-row items-center ${isFocused ? 'border-primary' : 'border-border'}`}
      >
        <TextInput
          className="text-text text-base flex-1"
          value={displayValue}
          onChangeText={setInputValue}
          onFocus={() => {
            setIsFocused(true);
            setInputValue(apiKey);
          }}
          onBlur={handleBlur}
          secureTextEntry={!isRevealed}
          placeholder="輸入 Alpha Vantage API 金鑰"
          placeholderTextColor="#666"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable onPress={() => setIsRevealed(r => !r)} className="ml-2 px-1">
          <Text className="text-muted text-sm">{isRevealed ? '隱藏' : '顯示'}</Text>
        </Pressable>
      </View>

      <View className="flex-row gap-2">
        <Pressable
          onPress={handleTest}
          disabled={isTesting || !inputValue}
          className="flex-1 bg-surface border border-border rounded-lg py-2 items-center"
        >
          <Text className="text-primary text-sm">
            {isTesting ? '測試中...' : testResult === 'success' ? '已連線' : testResult === 'error' ? '失敗' : '測試'}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleClear}
          className="flex-1 bg-surface border border-border rounded-lg py-2 items-center"
        >
          <Text className="text-stock-down text-sm">清除</Text>
        </Pressable>
      </View>
    </View>
  );
}

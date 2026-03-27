import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Pressable, Text, TextInput, View } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { useI18n } from '../../i18n/useI18n';

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 4) return key;
  return '........' + key.slice(-4);
}

export function ApiKeyInput() {
  const { t } = useI18n();
  const apiKey = useSettingsStore(s => s.apiKey);
  const baseUrl = useSettingsStore(s => s.baseUrl);
  const modelName = useSettingsStore(s => s.modelName);
  const providerName = useSettingsStore(s => s.providerName);
  const saveApiKey = useSettingsStore(s => s.saveApiKey);
  const deleteApiKey = useSettingsStore(s => s.deleteApiKey);

  const [isRevealed, setIsRevealed] = useState(false);
  const [inputValue, setInputValue] = useState(apiKey);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isFocused) {
      setInputValue(apiKey);
    }
  }, [apiKey, isFocused, providerName]);

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
    showSavedToast();
  }

  async function handleTest() {
    if (!inputValue) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${inputValue}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1,
        }),
      });
      setTestResult(res.ok ? 'success' : 'error');
    } catch {
      setTestResult('error');
    } finally {
      setIsTesting(false);
    }
  }

  function handleClear() {
    Alert.alert(
      t('api.promptTitle'),
      t('api.promptBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteApiKey();
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
        <Text className="text-primary text-xs text-center">{t('common.saved')}</Text>
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
          placeholder={t('api.placeholder', { provider: providerName })}
          placeholderTextColor="#666"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable onPress={() => setIsRevealed(r => !r)} className="ml-2 px-1">
          <Text className="text-muted text-sm">{isRevealed ? t('common.hide') : t('common.show')}</Text>
        </Pressable>
      </View>

      <View className="flex-row gap-2">
        <Pressable
          onPress={handleTest}
          disabled={isTesting || !inputValue}
          className="flex-1 bg-surface border border-border rounded-lg py-2 items-center"
        >
          <Text className="text-primary text-sm">
            {isTesting ? t('common.testing') : testResult === 'success' ? t('common.connected') : testResult === 'error' ? t('common.failed') : t('common.test')}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleClear}
          className="flex-1 bg-surface border border-border rounded-lg py-2 items-center"
        >
          <Text className="text-stock-down text-sm">{t('common.clear')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

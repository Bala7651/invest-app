import { startActivityAsync, ActivityAction } from 'expo-intent-launcher';
import { useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ApiKeyInput } from '../features/settings/components/ApiKeyInput';
import { GlowPillSelector } from '../features/settings/components/GlowPillSelector';
import { useSettingsStore } from '../features/settings/store/settingsStore';

function SavedToast({ opacityRef }: { opacityRef: Animated.Value }) {
  return (
    <Animated.View
      style={{ opacity: opacityRef, position: 'absolute', right: 0, top: 0 }}
      pointerEvents="none"
    >
      <Text className="text-primary text-xs">Saved</Text>
    </Animated.View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const modelName = useSettingsStore(s => s.modelName);
  const baseUrl = useSettingsStore(s => s.baseUrl);
  const glowLevel = useSettingsStore(s => s.glowLevel);
  const setModelName = useSettingsStore(s => s.setModelName);
  const setBaseUrl = useSettingsStore(s => s.setBaseUrl);
  const setGlowLevel = useSettingsStore(s => s.setGlowLevel);

  const [modelValue, setModelValue] = useState(modelName);
  const [urlValue, setUrlValue] = useState(baseUrl);
  const [modelFocused, setModelFocused] = useState(false);
  const [urlFocused, setUrlFocused] = useState(false);
  const modelToastOpacity = useRef(new Animated.Value(0)).current;
  const urlToastOpacity = useRef(new Animated.Value(0)).current;

  function showToast(opacityRef: Animated.Value) {
    Animated.sequence([
      Animated.timing(opacityRef, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.delay(1000),
      Animated.timing(opacityRef, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }

  async function handleModelBlur() {
    setModelFocused(false);
    await setModelName(modelValue);
    showToast(modelToastOpacity);
  }

  async function handleUrlBlur() {
    setUrlFocused(false);
    await setBaseUrl(urlValue);
    showToast(urlToastOpacity);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 16, paddingTop: 48 }}>
        <View className="flex-row items-center mb-6">
          <Pressable onPress={() => router.back()} className="mr-4">
            <Text className="text-primary text-base">Back</Text>
          </Pressable>
          <Text className="text-text text-2xl font-bold">Settings</Text>
        </View>

        {/* API Configuration section */}
        <Text className="text-muted text-xs uppercase tracking-widest mb-3">API Configuration</Text>
        <View className="bg-surface border border-border rounded-lg p-4 mb-4">

          <Text className="text-muted text-xs mb-1">API Key</Text>
          <ApiKeyInput />

          <View className="mt-4" style={{ position: 'relative' }}>
            <Text className="text-muted text-xs mb-1">AI Model</Text>
            <SavedToast opacityRef={modelToastOpacity} />
            <TextInput
              className={`bg-bg border rounded-lg px-3 py-2 text-text text-base ${modelFocused ? 'border-primary' : 'border-border'}`}
              value={modelValue}
              onChangeText={setModelValue}
              onFocus={() => setModelFocused(true)}
              onBlur={handleModelBlur}
              placeholder="MiniMax-M2.5"
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View className="mt-4" style={{ position: 'relative' }}>
            <Text className="text-muted text-xs mb-1">Base URL</Text>
            <SavedToast opacityRef={urlToastOpacity} />
            <TextInput
              className={`bg-bg border rounded-lg px-3 py-2 text-text text-base ${urlFocused ? 'border-primary' : 'border-border'}`}
              value={urlValue}
              onChangeText={setUrlValue}
              onFocus={() => setUrlFocused(true)}
              onBlur={handleUrlBlur}
              placeholder="https://api.minimax.io/v1"
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>
        </View>

        {/* Display section */}
        <Text className="text-muted text-xs uppercase tracking-widest mb-3">Display</Text>
        <View className="bg-surface border border-border rounded-lg p-4 mb-4">
          <Text className="text-muted text-xs mb-3">Glow Intensity</Text>
          <GlowPillSelector
            active={glowLevel}
            onSelect={setGlowLevel}
          />
        </View>

        {/* Alerts section — Android only */}
        {Platform.OS === 'android' ? (
          <>
            <Text className="text-muted text-xs uppercase tracking-widest mb-3">Alerts</Text>
            <View className="bg-surface border border-border rounded-lg mb-4">
              <Pressable
                testID="battery-optimization-row"
                onPress={() => startActivityAsync(ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS)}
                className="p-4"
              >
                <View className="flex-row items-center justify-between">
                  <View style={{ flex: 1 }}>
                    <Text className="text-text text-base">Battery Optimization</Text>
                    <Text className="text-muted text-xs mt-1">Disable for reliable background price alerts</Text>
                  </View>
                  <Text className="text-primary text-sm">Open Settings</Text>
                </View>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

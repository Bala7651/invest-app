import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function SettingsScreen() {
  const router = useRouter();
  return (
    <View className="flex-1 bg-bg px-4 pt-12">
      <View className="flex-row items-center mb-6">
        <Pressable onPress={() => router.back()} className="mr-4">
          <Text className="text-primary text-base">Back</Text>
        </Pressable>
        <Text className="text-text text-2xl font-bold">Settings</Text>
      </View>
      <View className="bg-surface rounded-lg p-4 border border-border mb-3">
        <Text className="text-text text-base">API Key</Text>
        <Text className="text-muted text-sm mt-1">Configure MiniMax API key</Text>
      </View>
      <View className="bg-surface rounded-lg p-4 border border-border">
        <Text className="text-text text-base">Glow Intensity</Text>
        <Text className="text-muted text-sm mt-1">Subtle / Medium / Heavy</Text>
      </View>
    </View>
  );
}

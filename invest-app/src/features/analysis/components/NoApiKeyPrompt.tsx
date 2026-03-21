import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

export function NoApiKeyPrompt() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-primary text-xl font-bold mb-3">AI Analysis</Text>
      <Text className="text-muted text-center mb-6 px-6">
        Add your MiniMax API key to unlock AI analysis
      </Text>
      <Pressable
        className="bg-primary rounded-lg px-6 py-3"
        onPress={() => router.push('/settings')}
      >
        <Text className="text-bg font-semibold">Go to Settings</Text>
      </Pressable>
    </View>
  );
}

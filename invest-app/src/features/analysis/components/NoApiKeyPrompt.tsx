import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useI18n } from '../../i18n/useI18n';

interface NoApiKeyPromptProps {
  titleKey?: string;
  bodyKey?: string;
}

export function NoApiKeyPrompt({
  titleKey = 'analysis.title',
  bodyKey = 'analysis.noApiBody',
}: NoApiKeyPromptProps) {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-primary text-xl font-bold mb-3">{t(titleKey)}</Text>
      <Text className="text-muted text-center mb-6 px-6">
        {t(bodyKey)}
      </Text>
      <Pressable
        className="bg-primary rounded-lg px-6 py-3"
        onPress={() => router.push('/settings')}
      >
        <Text className="text-bg font-semibold">{t('settings.openSettings')}</Text>
      </Pressable>
    </View>
  );
}

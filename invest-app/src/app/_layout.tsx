import '../global.css';
import { Stack } from 'expo-router';
import { View, Text } from 'react-native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { db } from '../db/client';
import migrations from '../../drizzle/migrations';

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-stock-down text-base">
          DB migration failed: {error.message}
        </Text>
      </View>
    );
  }

  if (!success) {
    return <View className="flex-1 bg-bg" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#050508' },
      }}
    />
  );
}

import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useWatchlistStore } from '../store/watchlistStore';
import { filterStocks, StockEntry } from '../utils/searchStocks';
import { useI18n } from '../../i18n/useI18n';

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SearchModal({ visible, onClose }: SearchModalProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockEntry[]>([]);
  const [addedSymbols, setAddedSymbols] = useState<Set<string>>(new Set());
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setResults([]);
      const items = useWatchlistStore.getState().items;
      setAddedSymbols(new Set(items.map(i => i.symbol)));
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

  function handleQueryChange(text: string) {
    setQuery(text);
    setResults(filterStocks(text));
  }

  async function handleAdd(entry: StockEntry) {
    await useWatchlistStore.getState().addItem(entry.code, entry.name);
    setAddedSymbols(prev => new Set([...prev, entry.code]));
  }

  function renderItem({ item }: { item: StockEntry }) {
    const isAdded = addedSymbols.has(item.code);
    return (
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <View className="flex-1">
          <Text className="text-primary font-semibold text-base">{item.code}</Text>
          <Text className="text-muted text-sm mt-0.5">{item.name}</Text>
        </View>
        <Pressable
          onPress={() => !isAdded && handleAdd(item)}
          className="w-8 h-8 items-center justify-center"
        >
          <Text className={`text-xl font-bold ${isAdded ? 'text-stock-up' : 'text-primary'}`}>
            {isAdded ? '✓' : '+'}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View className="flex-1 bg-bg">
        <View className="flex-row items-center justify-between px-4 pb-4 border-b border-border" style={{ paddingTop: 52 }}>
          <Text className="text-text text-xl font-bold">{t('watchlist.searchTitle')}</Text>
          <Pressable onPress={onClose}>
            <Text className="text-primary text-base">{t('common.close')}</Text>
          </Pressable>
        </View>

        <View className="px-4 py-3 border-b border-border">
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={handleQueryChange}
            placeholder={t('watchlist.searchHint')}
            placeholderTextColor="#6B7280"
            className="bg-surface text-text border border-border rounded-lg px-3 py-2 text-base"
            keyboardType="default"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        {query.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-muted text-base">{t('watchlist.searchEmpty')}</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={item => item.code}
            renderItem={renderItem}
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingBottom: 12 }}
          />
        )}
      </View>
    </Modal>
  );
}

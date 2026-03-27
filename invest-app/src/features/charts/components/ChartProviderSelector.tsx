import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SelectableChartProvider } from '../types';

export interface ChartProviderOption {
  value: SelectableChartProvider;
  label: string;
}

interface ChartProviderSelectorProps {
  value: SelectableChartProvider;
  options: ChartProviderOption[];
  onSelect: (provider: SelectableChartProvider) => void;
  disabled?: boolean;
  label: string;
}

export function ChartProviderSelector({
  value,
  options,
  onSelect,
  disabled = false,
  label,
}: ChartProviderSelectorProps) {
  const [open, setOpen] = useState(false);
  const activeLabel = options.find(option => option.value === value)?.label ?? value;

  return (
    <View style={{ marginTop: 10 }}>
      <Text className="text-muted text-xs mb-1">{label}</Text>
      <Pressable
        onPress={() => {
          if (!disabled) setOpen(current => !current);
        }}
        disabled={disabled}
        className="bg-surface border border-border rounded-lg px-3 py-2"
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Text
          className="text-text text-sm"
          numberOfLines={1}
          style={{ flex: 1, minWidth: 0, marginRight: 12 }}
        >
          {activeLabel}
        </Text>
        <Text className="text-muted text-xs">{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open ? (
        <View className="bg-surface border border-border rounded-lg mt-2 overflow-hidden">
          {options.map(option => {
            const isActive = option.value === value;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  onSelect(option.value);
                  setOpen(false);
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  backgroundColor: isActive ? 'rgba(77,124,255,0.16)' : 'transparent',
                }}
              >
                <Text style={{ color: isActive ? '#4D7CFF' : '#E0E0E0', fontSize: 14 }}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

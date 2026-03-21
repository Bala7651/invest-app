import { Pressable, Text, View } from 'react-native';
import { useAlertStore } from '../store/alertStore';

interface AlertStatusBarProps {
  symbol: string;
  onPress: () => void;
}

export function AlertStatusBar({ symbol, onPress }: AlertStatusBarProps) {
  const getBySymbol = useAlertStore(s => s.getBySymbol);
  const alert = getBySymbol(symbol);

  if (!alert) return null;

  const hasUpper = alert.upper_price !== null;
  const hasLower = alert.lower_price !== null;

  if (!hasUpper && !hasLower) return null;

  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, paddingHorizontal: 4 }}>
      {hasUpper ? (
        <Text style={{ color: alert.upper_status === 'active' ? '#00e5ff' : '#555', fontSize: 12 }}>
          ↑{alert.upper_price} {alert.upper_status === 'active' ? 'Active' : 'Triggered'}
        </Text>
      ) : null}
      {hasLower ? (
        <Text style={{ color: alert.lower_status === 'active' ? '#00e5ff' : '#555', fontSize: 12 }}>
          ↓{alert.lower_price} {alert.lower_status === 'active' ? 'Active' : 'Triggered'}
        </Text>
      ) : null}
    </Pressable>
  );
}

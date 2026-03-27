import * as Notifications from 'expo-notifications';
import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlertStore } from '../store/alertStore';
import { useI18n } from '../../i18n/useI18n';

interface AlertModalProps {
  visible: boolean;
  onClose: () => void;
  symbol: string;
  name: string;
  currentPrice: number | null;
}

export function AlertModal({ visible, onClose, symbol, name, currentPrice }: AlertModalProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const getBySymbol = useAlertStore(s => s.getBySymbol);
  const upsertAlert = useAlertStore(s => s.upsertAlert);
  const existing = getBySymbol(symbol);

  const defaultUpper =
    existing?.upper_price != null
      ? String(existing.upper_price)
      : currentPrice != null
        ? String(Math.ceil(currentPrice * 1.05))
        : '';
  const defaultLower =
    existing?.lower_price != null
      ? String(existing.lower_price)
      : currentPrice != null
        ? String(Math.floor(currentPrice * 0.95))
        : '';

  const [upperInput, setUpperInput] = useState(defaultUpper);
  const [lowerInput, setLowerInput] = useState(defaultLower);
  const [permissionWarning, setPermissionWarning] = useState(false);

  const upperValue = upperInput === '' ? null : parseFloat(upperInput);
  const lowerValue = lowerInput === '' ? null : parseFloat(lowerInput);

  const upperInvalid =
    upperValue !== null && currentPrice !== null && upperValue <= currentPrice;
  const lowerInvalid =
    lowerValue !== null && currentPrice !== null && lowerValue >= currentPrice;

  function handleOpen() {
    const ex = getBySymbol(symbol);
    setUpperInput(
      ex?.upper_price != null
        ? String(ex.upper_price)
        : currentPrice != null
          ? String(Math.ceil(currentPrice * 1.05))
          : ''
    );
    setLowerInput(
      ex?.lower_price != null
        ? String(ex.lower_price)
        : currentPrice != null
          ? String(Math.floor(currentPrice * 0.95))
          : ''
    );
    setPermissionWarning(false);
  }

  async function handleSave() {
    if (upperInvalid || lowerInvalid) return;
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      setPermissionWarning(true);
      return;
    }
    await upsertAlert(symbol, name, upperValue, lowerValue);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      onShow={handleOpen}
    >
      <Pressable
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}
        onPress={onClose}
      >
        <Pressable onPress={() => {}} style={{ backgroundColor: '#0d0d14', borderTopWidth: 1, borderTopColor: '#2a2a3a', borderRadius: 16, padding: 24, paddingBottom: 24 + insets.bottom }}>
          <Text style={{ color: '#e0e0e0', fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
            {t('alerts.title')} — {symbol}
          </Text>

          {permissionWarning ? (
            <Text style={{ color: '#ff4444', fontSize: 12, marginBottom: 12 }}>
              {t('alerts.permissionNeeded')}
            </Text>
          ) : null}

          {/* Upper target */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>{t('alerts.upperTarget')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: '#1a1a2a',
                  borderWidth: 1,
                  borderColor: upperInvalid ? '#ff4444' : '#2a2a3a',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  color: '#e0e0e0',
                  fontSize: 16,
                }}
                value={upperInput}
                onChangeText={setUpperInput}
                keyboardType="numeric"
                placeholder="—"
                placeholderTextColor="#555"
              />
              <Pressable onPress={() => setUpperInput('')} style={{ marginLeft: 8, padding: 4 }}>
                <Text style={{ color: '#888', fontSize: 16 }}>✕</Text>
              </Pressable>
            </View>
            {upperInvalid ? (
              <Text style={{ color: '#ff4444', fontSize: 11, marginTop: 4 }}>
                {t('alerts.mustBeHigher')}
              </Text>
            ) : null}
          </View>

          {/* Lower target */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>{t('alerts.lowerTarget')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: '#1a1a2a',
                  borderWidth: 1,
                  borderColor: lowerInvalid ? '#ff4444' : '#2a2a3a',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  color: '#e0e0e0',
                  fontSize: 16,
                }}
                value={lowerInput}
                onChangeText={setLowerInput}
                keyboardType="numeric"
                placeholder="—"
                placeholderTextColor="#555"
              />
              <Pressable onPress={() => setLowerInput('')} style={{ marginLeft: 8, padding: 4 }}>
                <Text style={{ color: '#888', fontSize: 16 }}>✕</Text>
              </Pressable>
            </View>
            {lowerInvalid ? (
              <Text style={{ color: '#ff4444', fontSize: 11, marginTop: 4 }}>
                {t('alerts.mustBeLower')}
              </Text>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={onClose}
              style={{ flex: 1, borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 8, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#888', fontSize: 15 }}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={{ flex: 1, backgroundColor: upperInvalid || lowerInvalid ? '#333' : '#00e5ff', borderRadius: 8, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: upperInvalid || lowerInvalid ? '#555' : '#050508', fontSize: 15, fontWeight: 'bold' }}>{t('common.save')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

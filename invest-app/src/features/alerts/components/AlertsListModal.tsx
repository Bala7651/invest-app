import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useAlertStore } from '../store/alertStore';
import type { AlertRow } from '../services/alertService';

interface AlertsListModalProps {
  visible: boolean;
  onClose: () => void;
}

function AlertRow({ alert }: { alert: AlertRow }) {
  const deleteAlert = useAlertStore(s => s.deleteAlert);
  const reEnable = useAlertStore(s => s.reEnable);

  const hasUpper = alert.upper_price !== null;
  const hasLower = alert.lower_price !== null;

  function renderRightActions() {
    return (
      <View style={{ backgroundColor: '#cc2222', justifyContent: 'center', alignItems: 'center', width: 72, borderRadius: 8, marginBottom: 8 }}>
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>刪除</Text>
      </View>
    );
  }

  return (
    <ReanimatedSwipeable
      renderRightActions={renderRightActions}
      onSwipeableOpen={() => deleteAlert(alert.id)}
      rightThreshold={40}
      friction={2}
    >
      <View style={{ backgroundColor: '#0d0d14', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 8, padding: 12, marginBottom: 8 }}>
        <Text style={{ color: '#e0e0e0', fontSize: 15, fontWeight: '600', marginBottom: 6 }}>{alert.name} ({alert.symbol})</Text>
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          {hasUpper ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: alert.upper_status === 'active' ? '#00e5ff' : '#555', fontSize: 13 }}>
                ↑{alert.upper_price} {alert.upper_status === 'active' ? '監控中' : '已觸發'}
              </Text>
              {alert.upper_status === 'triggered' ? (
                <Pressable onPress={() => reEnable(alert.symbol, 'upper')}>
                  <Text style={{ color: '#00e5ff', fontSize: 11 }}>重新啟用</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {hasLower ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: alert.lower_status === 'active' ? '#00e5ff' : '#555', fontSize: 13 }}>
                ↓{alert.lower_price} {alert.lower_status === 'active' ? '監控中' : '已觸發'}
              </Text>
              {alert.lower_status === 'triggered' ? (
                <Pressable onPress={() => reEnable(alert.symbol, 'lower')}>
                  <Text style={{ color: '#00e5ff', fontSize: 11 }}>重新啟用</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </ReanimatedSwipeable>
  );
}

export function AlertsListModal({ visible, onClose }: AlertsListModalProps) {
  const insets = useSafeAreaInsets();
  const alerts = useAlertStore(s => s.alerts);

  const active = alerts.filter(
    a => a.upper_status === 'active' || a.lower_status === 'active'
  );
  const triggered = alerts.filter(
    a => a.upper_status === 'triggered' && a.lower_status === 'triggered'
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}
        onPress={onClose}
      >
        <Pressable onPress={() => {}} style={{ backgroundColor: '#0d0d14', borderTopWidth: 1, borderTopColor: '#2a2a3a', borderRadius: 16, padding: 24, paddingBottom: 24 + insets.bottom, maxHeight: '80%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ color: '#e0e0e0', fontSize: 18, fontWeight: 'bold' }}>價格提醒</Text>
            <Pressable onPress={onClose}>
              <Text style={{ color: '#888', fontSize: 16 }}>✕</Text>
            </Pressable>
          </View>

          {alerts.length === 0 ? (
            <Text style={{ color: '#555', fontSize: 14, textAlign: 'center', paddingVertical: 32 }}>尚未設定提醒</Text>
          ) : (
            <>
              {active.length > 0 ? (
                <>
                  <Text style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>監控中</Text>
                  {active.map(a => <AlertRow key={a.id} alert={a} />)}
                </>
              ) : null}
              {triggered.length > 0 ? (
                <View style={{ opacity: 0.5 }}>
                  <Text style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>已觸發</Text>
                  {triggered.map(a => <AlertRow key={a.id} alert={a} />)}
                </View>
              ) : null}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

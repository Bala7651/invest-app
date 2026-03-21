import { useAlertStore } from '../features/alerts/store/alertStore';
import type { AlertRow } from '../features/alerts/services/alertService';

jest.mock('../features/alerts/services/alertService', () => ({
  getAll: jest.fn(),
  upsertAlert: jest.fn(),
  deleteAlert: jest.fn(),
  reEnableDirection: jest.fn(),
  markTriggered: jest.fn(),
  getActiveSymbols: jest.fn(),
}));

jest.mock('../features/alerts/services/alertTask', () => ({
  registerAlertTask: jest.fn(),
  unregisterAlertTask: jest.fn(),
  ALERT_CHECK_TASK: 'PRICE_ALERT_CHECK',
}));

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  dismissNotificationAsync: jest.fn(),
}));

import * as alertService from '../features/alerts/services/alertService';
import { registerAlertTask, unregisterAlertTask } from '../features/alerts/services/alertTask';
import * as Notifications from 'expo-notifications';

const mockGetAll = alertService.getAll as jest.MockedFunction<typeof alertService.getAll>;
const mockUpsertAlert = alertService.upsertAlert as jest.MockedFunction<typeof alertService.upsertAlert>;
const mockDeleteAlert = alertService.deleteAlert as jest.MockedFunction<typeof alertService.deleteAlert>;
const mockReEnableDirection = alertService.reEnableDirection as jest.MockedFunction<typeof alertService.reEnableDirection>;
const mockRegisterTask = registerAlertTask as jest.MockedFunction<typeof registerAlertTask>;
const mockUnregisterTask = unregisterAlertTask as jest.MockedFunction<typeof unregisterAlertTask>;
const mockSchedule = Notifications.scheduleNotificationAsync as jest.MockedFunction<typeof Notifications.scheduleNotificationAsync>;
const mockDismiss = Notifications.dismissNotificationAsync as jest.MockedFunction<typeof Notifications.dismissNotificationAsync>;

const makeAlert = (overrides: Partial<AlertRow> = {}): AlertRow => ({
  id: 1,
  symbol: '2330',
  name: '台積電',
  upper_price: 1000,
  lower_price: 900,
  upper_status: 'active',
  lower_status: 'active',
  ...overrides,
});

beforeEach(() => {
  useAlertStore.setState({ alerts: [] });
  jest.clearAllMocks();
  mockUpsertAlert.mockResolvedValue(undefined);
  mockDeleteAlert.mockResolvedValue(undefined);
  mockReEnableDirection.mockResolvedValue(undefined);
  mockRegisterTask.mockResolvedValue(undefined);
  mockUnregisterTask.mockResolvedValue(undefined);
  mockSchedule.mockResolvedValue('id' as any);
  mockDismiss.mockResolvedValue(undefined);
});

describe('loadFromDb', () => {
  it('populates store from alertService.getAll', async () => {
    const rows = [makeAlert()];
    mockGetAll.mockResolvedValue(rows);

    await useAlertStore.getState().loadFromDb();

    expect(mockGetAll).toHaveBeenCalledTimes(1);
    expect(useAlertStore.getState().alerts).toEqual(rows);
  });

  it('sets empty alerts when db is empty', async () => {
    mockGetAll.mockResolvedValue([]);

    await useAlertStore.getState().loadFromDb();

    expect(useAlertStore.getState().alerts).toEqual([]);
  });
});

describe('upsertAlert', () => {
  it('calls alertService.upsertAlert with correct args', async () => {
    mockGetAll.mockResolvedValue([makeAlert()]);

    await useAlertStore.getState().upsertAlert('2330', '台積電', 1000, 900);

    expect(mockUpsertAlert).toHaveBeenCalledWith('2330', '台積電', 1000, 900);
  });

  it('updates store state with new alert row', async () => {
    const row = makeAlert();
    mockGetAll.mockResolvedValue([row]);

    await useAlertStore.getState().upsertAlert('2330', '台積電', 1000, 900);

    expect(useAlertStore.getState().alerts).toContainEqual(row);
  });

  it('replaces existing alert for same symbol in state', async () => {
    useAlertStore.setState({ alerts: [makeAlert({ upper_price: 800 })] });
    const updatedRow = makeAlert({ upper_price: 1000 });
    mockGetAll.mockResolvedValue([updatedRow]);

    await useAlertStore.getState().upsertAlert('2330', '台積電', 1000, 900);

    const alerts = useAlertStore.getState().alerts;
    expect(alerts).toHaveLength(1);
    expect(alerts[0].upper_price).toBe(1000);
  });

  it('calls registerAlertTask after upsert when active alerts exist', async () => {
    mockGetAll.mockResolvedValue([makeAlert()]);

    await useAlertStore.getState().upsertAlert('2330', '台積電', 1000, 900);

    expect(mockRegisterTask).toHaveBeenCalledTimes(1);
  });

  it('does not call registerAlertTask when no active alerts', async () => {
    mockGetAll.mockResolvedValue([makeAlert({ upper_status: 'triggered', lower_status: 'triggered' })]);

    await useAlertStore.getState().upsertAlert('2330', '台積電', null, null);

    expect(mockRegisterTask).not.toHaveBeenCalled();
  });
});

describe('deleteAlert', () => {
  it('calls alertService.deleteAlert with correct id', async () => {
    useAlertStore.setState({ alerts: [makeAlert()] });

    await useAlertStore.getState().deleteAlert(1);

    expect(mockDeleteAlert).toHaveBeenCalledWith(1);
  });

  it('removes alert from state', async () => {
    useAlertStore.setState({
      alerts: [makeAlert({ id: 1 }), makeAlert({ id: 2, symbol: '2317', name: '鴻海' })],
    });

    await useAlertStore.getState().deleteAlert(1);

    const alerts = useAlertStore.getState().alerts;
    expect(alerts).toHaveLength(1);
    expect(alerts[0].id).toBe(2);
  });

  it('calls unregisterAlertTask when last alert is deleted', async () => {
    useAlertStore.setState({ alerts: [makeAlert()] });

    await useAlertStore.getState().deleteAlert(1);

    expect(mockUnregisterTask).toHaveBeenCalledTimes(1);
  });

  it('calls dismissMonitoringNotification when last alert is deleted', async () => {
    useAlertStore.setState({ alerts: [makeAlert()] });

    await useAlertStore.getState().deleteAlert(1);

    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  it('does NOT call unregisterAlertTask when alerts remain', async () => {
    useAlertStore.setState({
      alerts: [makeAlert({ id: 1 }), makeAlert({ id: 2, symbol: '2317', name: '鴻海' })],
    });

    await useAlertStore.getState().deleteAlert(1);

    expect(mockUnregisterTask).not.toHaveBeenCalled();
  });
});

describe('reEnable', () => {
  it('calls alertService.reEnableDirection with correct args', async () => {
    mockGetAll.mockResolvedValue([makeAlert()]);

    await useAlertStore.getState().reEnable('2330', 'upper');

    expect(mockReEnableDirection).toHaveBeenCalledWith('2330', 'upper');
  });

  it('reloads from DB after re-enabling', async () => {
    const rows = [makeAlert()];
    mockGetAll.mockResolvedValue(rows);

    await useAlertStore.getState().reEnable('2330', 'upper');

    expect(mockGetAll).toHaveBeenCalledTimes(1);
    expect(useAlertStore.getState().alerts).toEqual(rows);
  });
});

describe('getBySymbol', () => {
  it('returns matching alert row by symbol', () => {
    const alert = makeAlert();
    useAlertStore.setState({ alerts: [alert] });

    const result = useAlertStore.getState().getBySymbol('2330');

    expect(result).toEqual(alert);
  });

  it('returns undefined when symbol not found', () => {
    useAlertStore.setState({ alerts: [makeAlert()] });

    const result = useAlertStore.getState().getBySymbol('9999');

    expect(result).toBeUndefined();
  });
});

describe('activeCount', () => {
  it('returns count of alerts with at least one active direction', () => {
    useAlertStore.setState({
      alerts: [
        makeAlert({ upper_status: 'active', lower_status: 'triggered' }),
        makeAlert({ id: 2, symbol: '2317', name: '鴻海', upper_status: 'triggered', lower_status: 'active' }),
        makeAlert({ id: 3, symbol: '2454', name: '聯發科', upper_status: 'triggered', lower_status: 'triggered' }),
      ],
    });

    expect(useAlertStore.getState().activeCount()).toBe(2);
  });

  it('returns 0 when all alerts are triggered', () => {
    useAlertStore.setState({
      alerts: [makeAlert({ upper_status: 'triggered', lower_status: 'triggered' })],
    });

    expect(useAlertStore.getState().activeCount()).toBe(0);
  });

  it('returns 0 when no alerts exist', () => {
    useAlertStore.setState({ alerts: [] });

    expect(useAlertStore.getState().activeCount()).toBe(0);
  });

  it('counts alert as active when both directions are active', () => {
    useAlertStore.setState({
      alerts: [makeAlert({ upper_status: 'active', lower_status: 'active' })],
    });

    expect(useAlertStore.getState().activeCount()).toBe(1);
  });
});

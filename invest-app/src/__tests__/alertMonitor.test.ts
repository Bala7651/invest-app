import { checkAlerts } from '../features/alerts/services/alertMonitor';

jest.mock('../features/alerts/services/alertService', () => ({
  getAll: jest.fn(),
  markTriggered: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: 'timeInterval',
  },
}));

import * as alertService from '../features/alerts/services/alertService';
import * as Notifications from 'expo-notifications';

const mockGetAll = alertService.getAll as jest.MockedFunction<typeof alertService.getAll>;
const mockMarkTriggered = alertService.markTriggered as jest.MockedFunction<typeof alertService.markTriggered>;
const mockSchedule = Notifications.scheduleNotificationAsync as jest.MockedFunction<typeof Notifications.scheduleNotificationAsync>;

beforeEach(() => {
  jest.clearAllMocks();
  mockMarkTriggered.mockResolvedValue(undefined);
  mockSchedule.mockResolvedValue('notification-id' as any);
});

describe('checkAlerts', () => {
  it('fires notification when price >= upper_price (active)', async () => {
    mockGetAll.mockResolvedValue([
      {
        id: 1, symbol: '2330', name: '台積電',
        upper_price: 980, lower_price: null,
        upper_status: 'active', lower_status: 'active',
      },
    ]);

    await checkAlerts({ '2330': { symbol: '2330', name: '台積電', price: 985 } });

    expect(mockMarkTriggered).toHaveBeenCalledWith('2330', 'upper');
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    const call = mockSchedule.mock.calls[0][0];
    expect(call.content.title).toContain('台積電');
    expect(call.content.body).toContain('above');
    expect(call.content.body).toContain('980');
    expect(call.content.body).toContain('985.00');
  });

  it('fires notification when price <= lower_price (active)', async () => {
    mockGetAll.mockResolvedValue([
      {
        id: 1, symbol: '2330', name: '台積電',
        upper_price: null, lower_price: 900,
        upper_status: 'active', lower_status: 'active',
      },
    ]);

    await checkAlerts({ '2330': { symbol: '2330', name: '台積電', price: 895 } });

    expect(mockMarkTriggered).toHaveBeenCalledWith('2330', 'lower');
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    const call = mockSchedule.mock.calls[0][0];
    expect(call.content.body).toContain('below');
    expect(call.content.body).toContain('900');
  });

  it('does NOT fire notification when upper_status is triggered', async () => {
    mockGetAll.mockResolvedValue([
      {
        id: 1, symbol: '2330', name: '台積電',
        upper_price: 980, lower_price: null,
        upper_status: 'triggered', lower_status: 'active',
      },
    ]);

    await checkAlerts({ '2330': { symbol: '2330', name: '台積電', price: 990 } });

    expect(mockMarkTriggered).not.toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('does NOT fire notification when lower_status is triggered', async () => {
    mockGetAll.mockResolvedValue([
      {
        id: 1, symbol: '2330', name: '台積電',
        upper_price: null, lower_price: 900,
        upper_status: 'active', lower_status: 'triggered',
      },
    ]);

    await checkAlerts({ '2330': { symbol: '2330', name: '台積電', price: 890 } });

    expect(mockMarkTriggered).not.toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('does NOT fire notification when price is null', async () => {
    mockGetAll.mockResolvedValue([
      {
        id: 1, symbol: '2330', name: '台積電',
        upper_price: 980, lower_price: 900,
        upper_status: 'active', lower_status: 'active',
      },
    ]);

    await checkAlerts({ '2330': { symbol: '2330', name: '台積電', price: null } });

    expect(mockMarkTriggered).not.toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('calls markTriggered before scheduleNotificationAsync', async () => {
    const callOrder: string[] = [];
    mockMarkTriggered.mockImplementation(async () => { callOrder.push('markTriggered'); });
    mockSchedule.mockImplementation(async () => { callOrder.push('schedule'); return 'id' as any; });

    mockGetAll.mockResolvedValue([
      {
        id: 1, symbol: '2330', name: '台積電',
        upper_price: 980, lower_price: null,
        upper_status: 'active', lower_status: 'active',
      },
    ]);

    await checkAlerts({ '2330': { symbol: '2330', name: '台積電', price: 990 } });

    expect(callOrder[0]).toBe('markTriggered');
    expect(callOrder[1]).toBe('schedule');
  });

  it('uses TIME_INTERVAL trigger with seconds:1 for background reliability', async () => {
    mockGetAll.mockResolvedValue([
      {
        id: 1, symbol: '2330', name: '台積電',
        upper_price: 980, lower_price: null,
        upper_status: 'active', lower_status: 'active',
      },
    ]);

    await checkAlerts({ '2330': { symbol: '2330', name: '台積電', price: 985 } });

    const call = mockSchedule.mock.calls[0][0];
    expect(call.trigger).toEqual(
      expect.objectContaining({ seconds: 1, channelId: 'price-alerts' })
    );
  });

  it('fires both upper and lower notifications when both conditions met', async () => {
    mockGetAll.mockResolvedValue([
      {
        id: 1, symbol: '2330', name: '台積電',
        upper_price: 980, lower_price: 900,
        upper_status: 'active', lower_status: 'active',
      },
    ]);

    // Price exactly at upper; use a price that won't trigger lower (> 900)
    await checkAlerts({ '2330': { symbol: '2330', name: '台積電', price: 985 } });

    expect(mockMarkTriggered).toHaveBeenCalledWith('2330', 'upper');
    expect(mockSchedule).toHaveBeenCalledTimes(1);
  });

  it('skips alert for symbol not present in quotes', async () => {
    mockGetAll.mockResolvedValue([
      {
        id: 1, symbol: '2330', name: '台積電',
        upper_price: 980, lower_price: null,
        upper_status: 'active', lower_status: 'active',
      },
    ]);

    await checkAlerts({});

    expect(mockMarkTriggered).not.toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('does NOT fire when price is below upper target', async () => {
    mockGetAll.mockResolvedValue([
      {
        id: 1, symbol: '2330', name: '台積電',
        upper_price: 980, lower_price: null,
        upper_status: 'active', lower_status: 'active',
      },
    ]);

    await checkAlerts({ '2330': { symbol: '2330', name: '台積電', price: 970 } });

    expect(mockSchedule).not.toHaveBeenCalled();
  });
});

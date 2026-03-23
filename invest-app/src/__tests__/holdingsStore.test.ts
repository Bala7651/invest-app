import { useHoldingsStore } from '../features/portfolio/store/holdingsStore';

jest.mock('../features/portfolio/services/holdingsService', () => ({
  upsertHolding: jest.fn(),
  getAllHoldings: jest.fn(),
  deleteHolding: jest.fn(),
}));

import * as holdingsService from '../features/portfolio/services/holdingsService';

const mockGetAllHoldings = holdingsService.getAllHoldings as jest.MockedFunction<typeof holdingsService.getAllHoldings>;
const mockUpsertHolding = holdingsService.upsertHolding as jest.MockedFunction<typeof holdingsService.upsertHolding>;
const mockDeleteHolding = holdingsService.deleteHolding as jest.MockedFunction<typeof holdingsService.deleteHolding>;

const makeHolding = (overrides = {}) => ({
  id: 1,
  symbol: '2330',
  name: '台積電',
  quantity: 5000,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

beforeEach(() => {
  useHoldingsStore.setState({ holdings: {}, loading: false, error: null });
  jest.clearAllMocks();
  mockUpsertHolding.mockResolvedValue(undefined);
  mockDeleteHolding.mockResolvedValue(undefined);
});

describe('loadHoldings', () => {
  it('calls getAllHoldings and populates store.holdings map keyed by symbol', async () => {
    const rows = [
      makeHolding({ symbol: '2330', name: '台積電', quantity: 5000 }),
      makeHolding({ id: 2, symbol: '2317', name: '鴻海', quantity: 2000 }),
    ];
    mockGetAllHoldings.mockResolvedValue(rows);

    await useHoldingsStore.getState().loadHoldings();

    expect(mockGetAllHoldings).toHaveBeenCalledTimes(1);
    const { holdings } = useHoldingsStore.getState();
    expect(holdings['2330']).toEqual(rows[0]);
    expect(holdings['2317']).toEqual(rows[1]);
  });

  it('sets empty holdings map when db is empty', async () => {
    mockGetAllHoldings.mockResolvedValue([]);

    await useHoldingsStore.getState().loadHoldings();

    expect(useHoldingsStore.getState().holdings).toEqual({});
  });
});

describe('setQuantity', () => {
  it('calls upsertHolding and updates store.holdings[symbol].quantity when quantity > 0', async () => {
    const row = makeHolding({ symbol: '2330', name: '台積電', quantity: 8000 });
    mockGetAllHoldings.mockResolvedValue([row]);

    await useHoldingsStore.getState().setQuantity('2330', '台積電', 8000);

    expect(mockUpsertHolding).toHaveBeenCalledWith('2330', '台積電', 8000);
    const { holdings } = useHoldingsStore.getState();
    expect(holdings['2330'].quantity).toBe(8000);
  });

  it('calls deleteHolding and removes symbol from store.holdings when quantity === 0', async () => {
    useHoldingsStore.setState({
      holdings: { '2330': makeHolding() },
    });

    await useHoldingsStore.getState().setQuantity('2330', '台積電', 0);

    expect(mockDeleteHolding).toHaveBeenCalledWith('2330');
    const { holdings } = useHoldingsStore.getState();
    expect(holdings['2330']).toBeUndefined();
  });
});

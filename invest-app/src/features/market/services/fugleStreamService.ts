export interface FugleTradeUpdate {
  symbol: string;
  price: number;
  bid: number | null;
  ask: number | null;
  volume: number;
  updatedAt: number;
}

interface FugleStreamHandlers {
  onTrade: (update: FugleTradeUpdate) => void;
  onStatus?: (message: string | null) => void;
}

interface FugleStreamMessage {
  event?: string;
  channel?: string;
  data?: Record<string, unknown>;
}

const STREAM_URL = 'wss://api.fugle.tw/marketdata/v1.0/stock/streaming';

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let desiredSymbols: string[] = [];
let apiKey = '';
let handlers: FugleStreamHandlers | null = null;
let intentionalClose = false;

function parseNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeTimestamp(value: unknown): number {
  const timestamp = parseNumber(value);
  if (timestamp == null) return Date.now();
  if (timestamp > 1_000_000_000_000_000) return Math.floor(timestamp / 1000);
  if (timestamp > 10_000_000_000_000) return Math.floor(timestamp / 1000);
  return timestamp;
}

function emitStatus(message: string | null) {
  handlers?.onStatus?.(message);
}

function parseTradeUpdate(message: FugleStreamMessage): FugleTradeUpdate | null {
  if (message.event !== 'data' || message.channel !== 'trades' || !message.data) {
    return null;
  }

  const symbol = typeof message.data.symbol === 'string' ? message.data.symbol : null;
  const price =
    parseNumber(message.data.price) ??
    parseNumber(message.data.lastPrice) ??
    parseNumber(message.data.closePrice);
  if (!symbol || price == null) {
    return null;
  }

  const bid =
    parseNumber(message.data.bid) ??
    parseNumber((message.data.bids as Array<{ price?: number }> | undefined)?.[0]?.price);
  const ask =
    parseNumber(message.data.ask) ??
    parseNumber((message.data.asks as Array<{ price?: number }> | undefined)?.[0]?.price);
  const volume =
    parseNumber(message.data.volume) ??
    parseNumber(message.data.size) ??
    parseNumber((message.data.total as { tradeVolume?: number } | undefined)?.tradeVolume) ??
    0;

  return {
    symbol,
    price,
    bid: bid ?? null,
    ask: ask ?? null,
    volume,
    updatedAt:
      normalizeTimestamp(message.data.lastUpdated) ||
      normalizeTimestamp(message.data.time) ||
      Date.now(),
  };
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function closeSocket() {
  if (socket) {
    const target = socket;
    socket = null;
    target.onopen = null;
    target.onmessage = null;
    target.onerror = null;
    target.onclose = null;
    try {
      target.close();
    } catch {}
  }
}

function scheduleReconnect() {
  clearReconnectTimer();
  if (!apiKey || desiredSymbols.length === 0 || !handlers) return;
  const delay = Math.min(15_000, 1_500 * Math.max(1, reconnectAttempts + 1));
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    openSocket();
  }, delay);
}

function subscribeSymbols() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  for (const symbol of desiredSymbols) {
    socket.send(JSON.stringify({
      event: 'subscribe',
      data: { channel: 'trades', symbol },
    }));
  }
}

function openSocket() {
  closeSocket();
  intentionalClose = false;
  socket = new WebSocket(STREAM_URL);

  socket.onopen = () => {
    reconnectAttempts = 0;
    emitStatus(null);
    socket?.send(JSON.stringify({
      event: 'auth',
      data: { apikey: apiKey },
    }));
  };

  socket.onmessage = (event) => {
    try {
      const raw = typeof event.data === 'string' ? event.data : String(event.data);
      const message = JSON.parse(raw) as FugleStreamMessage;

      if (message.event === 'authenticated') {
        subscribeSymbols();
        return;
      }

      if (message.event === 'error') {
        emitStatus(typeof message.data?.message === 'string' ? message.data.message : 'Fugle 連線失敗');
        return;
      }

      const update = parseTradeUpdate(message);
      if (update) {
        handlers?.onTrade(update);
      }
    } catch {
      emitStatus('Fugle 訊息解析失敗');
    }
  };

  socket.onerror = () => {
    emitStatus('Fugle WebSocket 連線異常');
  };

  socket.onclose = () => {
    socket = null;
    if (intentionalClose) return;
    reconnectAttempts += 1;
    emitStatus('Fugle WebSocket 已斷線，嘗試重連');
    scheduleReconnect();
  };
}

export function connectFugleWatchlistStream(
  nextApiKey: string,
  symbols: string[],
  nextHandlers: FugleStreamHandlers,
) {
  apiKey = nextApiKey.trim();
  desiredSymbols = Array.from(new Set(symbols.filter(Boolean)));
  handlers = nextHandlers;

  if (!apiKey || desiredSymbols.length === 0) {
    disconnectFugleWatchlistStream();
    return;
  }

  clearReconnectTimer();
  openSocket();
}

export function disconnectFugleWatchlistStream() {
  intentionalClose = true;
  clearReconnectTimer();
  desiredSymbols = [];
  apiKey = '';
  handlers = null;
  closeSocket();
}

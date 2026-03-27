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
  onAuthenticated?: () => void;
  onSubscribed?: () => void;
  onDisconnected?: () => void;
  onUnauthorized?: () => void;
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
let authFailed = false;

function sameSymbols(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((symbol, index) => symbol === b[index]);
}

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

function t(key: string): string {
  return translate(useSettingsStore.getState().language, key);
}

function isAuthFailure(message: string | null | undefined): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes('unauthorized') || normalized.includes('auth') || normalized.includes('apikey');
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
  authFailed = false;
  socket = new WebSocket(STREAM_URL);

  socket.onopen = () => {
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
        reconnectAttempts = 0;
        emitStatus(null);
        handlers?.onAuthenticated?.();
        subscribeSymbols();
        return;
      }

      if (message.event === 'subscribed') {
        handlers?.onSubscribed?.();
        return;
      }

      if (message.event === 'error') {
        const errorMessage =
          typeof message.data?.message === 'string' ? message.data.message : t('market.error.fugleConnect');
        emitStatus(errorMessage);
        if (isAuthFailure(errorMessage)) {
          authFailed = true;
          handlers?.onUnauthorized?.();
          intentionalClose = true;
          closeSocket();
        }
        return;
      }

      const update = parseTradeUpdate(message);
      if (update) {
        handlers?.onTrade(update);
      }
    } catch {
      emitStatus(t('market.error.fugleMessageParse'));
    }
  };

  socket.onerror = () => {
    emitStatus(t('market.error.fugleSocketError'));
  };

  socket.onclose = () => {
    socket = null;
    handlers?.onDisconnected?.();
    if (intentionalClose) return;
    if (authFailed) return;
    reconnectAttempts += 1;
    emitStatus(t('market.error.fugleSocketReconnect'));
    scheduleReconnect();
  };
}

export function connectFugleWatchlistStream(
  nextApiKey: string,
  symbols: string[],
  nextHandlers: FugleStreamHandlers,
) {
  const normalizedApiKey = nextApiKey.trim();
  const normalizedSymbols = Array.from(new Set(symbols.filter(Boolean)));

  if (
    socket &&
    apiKey === normalizedApiKey &&
    sameSymbols(desiredSymbols, normalizedSymbols) &&
    (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
  ) {
    handlers = nextHandlers;
    return;
  }

  apiKey = normalizedApiKey;
  desiredSymbols = normalizedSymbols;
  handlers = nextHandlers;
  authFailed = false;

  if (!apiKey || desiredSymbols.length === 0) {
    disconnectFugleWatchlistStream();
    return;
  }

  clearReconnectTimer();
  openSocket();
}

export function disconnectFugleWatchlistStream() {
  intentionalClose = true;
  authFailed = false;
  clearReconnectTimer();
  desiredSymbols = [];
  apiKey = '';
  handlers = null;
  closeSocket();
}
import { translate } from '../../i18n/translations';
import { useSettingsStore } from '../../settings/store/settingsStore';

export interface TWSEQuote {
  symbol: string;
  name: string;
  price: number | null;
  prevClose: number;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number;
  updatedAt: number;
}

export function parseSentinel(val: string): number | null {
  if (val === '-' || val === '') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

class RequestQueue {
  private running = false;
  private queue: Array<() => Promise<void>> = [];
  private lastRequestTime = 0;

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        const elapsed = Date.now() - this.lastRequestTime;
        const wait = Math.max(0, 2000 - elapsed);
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
        try {
          this.lastRequestTime = Date.now();
          resolve(await fn());
        } catch (e) {
          reject(e);
        }
      });
      if (!this.running) this._drain();
    });
  }

  private async _drain() {
    this.running = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      await task();
    }
    this.running = false;
  }
}

const _queue = new RequestQueue();

async function withRetry<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    await new Promise(r => setTimeout(r, 5_000));
    try {
      return await fn();
    } catch {
      return null;
    }
  }
}

async function _fetchQuotes(symbols: string[]): Promise<TWSEQuote[]> {
  const exCh = symbols.map(s => `tse_${s}.tw`).join('|');
  const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${encodeURIComponent(exCh)}&json=1&delay=0`;
  const result = await withRetry(async () => {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'invest-app/1.0' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`TWSE HTTP ${res.status}`);
    const data = await res.json();
    return (data.msgArray ?? []).map((item: any): TWSEQuote => ({
      symbol: item.c,
      name: item.n,
      price: parseSentinel(item.z),
      prevClose: parseFloat(item.y),
      open: parseSentinel(item.o),
      high: parseSentinel(item.h),
      low: parseSentinel(item.l),
      volume: parseFloat(item.v) || 0,
      updatedAt: parseInt(item.tlong, 10),
    }));
  });
  return result ?? [];
}

export async function getQuotes(symbols: string[]): Promise<TWSEQuote[]> {
  return _queue.enqueue(() => _fetchQuotes(symbols));
}

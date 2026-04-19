import { useEffect, useRef, useState } from 'react';
import { getStoredToken } from '../auth/tokenStorage';
import type { StockTile } from '../api/types';

type Status = 'connecting' | 'open' | 'closed' | 'error';

interface FeedState {
  tiles: StockTile[];
  status: Status;
  lastError: string | null;
}

const MAX_TILES = 200;

/**
 * Subscribes to the backend SSE feed at /api/feed/stocks using a streaming
 * fetch (so we can send Authorization headers — EventSource cannot).
 * Returns the rolling list of tiles, newest first, and the connection status.
 */
export function useStockFeed(): FeedState {
  const [tiles, setTiles] = useState<StockTile[]>([]);
  const [status, setStatus] = useState<Status>(() => (getStoredToken() ? 'connecting' : 'closed'));
  const [lastError, setLastError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    const controller = new AbortController();
    abortRef.current = controller;

    void (async () => {
      try {
        const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
        const res = await fetch(`${base}/api/feed/stocks`, {
          headers: {
            Accept: 'text/event-stream',
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          setStatus('error');
          setLastError(`SSE connect failed (${res.status})`);
          return;
        }
        setStatus('open');

        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          // Events are separated by blank lines.
          let sep = buffer.indexOf('\n\n');
          while (sep !== -1) {
            const raw = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            sep = buffer.indexOf('\n\n');
            handleEvent(raw, setTiles);
          }
        }
        setStatus('closed');
      } catch (err) {
        if (controller.signal.aborted) return;
        setStatus('error');
        setLastError(err instanceof Error ? err.message : 'SSE error');
      }
    })();

    return () => controller.abort();
  }, []);

  return { tiles, status, lastError };
}

function handleEvent(raw: string, setTiles: (updater: (prev: StockTile[]) => StockTile[]) => void) {
  let eventName = 'message';
  let data = '';
  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) eventName = line.slice(6).trim();
    else if (line.startsWith('data:')) data += (data ? '\n' : '') + line.slice(5).trim();
  }
  if (!data || eventName === 'ready') return;
  try {
    const payload = JSON.parse(data) as StockTile | { stocks?: StockTile[] };
    if (Array.isArray((payload as { stocks?: StockTile[] }).stocks)) {
      const many = (payload as { stocks: StockTile[] }).stocks;
      setTiles((prev) => dedupe([...many, ...prev]).slice(0, MAX_TILES));
    } else {
      const tile = payload as StockTile;
      if (tile.tradingsymbol) {
        setTiles((prev) => dedupe([tile, ...prev]).slice(0, MAX_TILES));
      }
    }
  } catch {
    // Ignore malformed payloads.
  }
}

function dedupe(tiles: StockTile[]): StockTile[] {
  const seen = new Set<string>();
  const out: StockTile[] = [];
  for (const t of tiles) {
    const key = `${t.tradingsymbol}|${t.exchange}|${t.receivedAt}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

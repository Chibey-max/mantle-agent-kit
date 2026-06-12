import { NextRequest, NextResponse } from "next/server";

const BYBIT_BASE = "https://api.bybit.com";
const FETCH_TIMEOUT_MS = 5000;

function generateMockKlines(symbol: string, count = 50) {
  const basePrice = symbol.startsWith("MNT") ? 0.038 : 1.0;
  const now = Date.now();
  const intervalMs = 15 * 60 * 1000;
  return Array.from({ length: count }, (_, i) => {
    const t = now - (count - 1 - i) * intervalMs;
    const noise = () => (Math.random() - 0.5) * basePrice * 0.02;
    const open = basePrice + noise();
    const close = open + noise();
    const high = Math.max(open, close) + Math.abs(noise());
    const low = Math.min(open, close) - Math.abs(noise());
    return { timestamp: t, open, high, low, close, volume: Math.random() * 1e6 };
  });
}

function fetchWithTimeout(url: string, ms: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "MNTUSDT";
  const interval = searchParams.get("interval") || "15";

  try {
    const [klinesRes, tickerRes] = await Promise.all([
      fetchWithTimeout(`${BYBIT_BASE}/v5/market/kline?category=spot&symbol=${symbol}&interval=${interval}&limit=50`, FETCH_TIMEOUT_MS),
      fetchWithTimeout(`${BYBIT_BASE}/v5/market/tickers?category=spot&symbol=${symbol}`, FETCH_TIMEOUT_MS),
    ]);

    const [klinesData, tickerData] = await Promise.all([
      klinesRes.json(),
      tickerRes.json(),
    ]);

    // Bybit kline format: [startTime, openPrice, highPrice, lowPrice, closePrice, volume, turnover]
    const rawKlines: string[][] = klinesData.result?.list || [];
    // Bybit returns newest first — reverse so chart is chronological
    const klines = [...rawKlines].reverse().map((k) => ({
      timestamp: Number(k[0]),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));

    const tickerRaw = tickerData.result?.list?.[0] || {};
    const ticker = {
      symbol: tickerRaw.symbol || symbol,
      lastPrice: tickerRaw.lastPrice || "0",
      priceChange24h: tickerRaw.price24hPcnt
        ? (parseFloat(tickerRaw.price24hPcnt) * 100).toFixed(2)
        : "0",
      volume24h: tickerRaw.volume24h || "0",
      highPrice24h: tickerRaw.highPrice24h || "0",
      lowPrice24h: tickerRaw.lowPrice24h || "0",
    };

    return NextResponse.json({ klines, ticker });
  } catch {
    // Bybit unreachable (network block or timeout) — return mock data so the UI renders
    const klines = generateMockKlines(symbol);
    const lastClose = klines[klines.length - 1].close;
    const ticker = {
      symbol,
      lastPrice: lastClose.toFixed(4),
      priceChange24h: ((Math.random() - 0.5) * 4).toFixed(2),
      volume24h: (Math.random() * 1e8).toFixed(0),
      highPrice24h: (lastClose * 1.02).toFixed(4),
      lowPrice24h: (lastClose * 0.98).toFixed(4),
      isMock: true,
    };
    return NextResponse.json({ klines, ticker, isMock: true });
  }
}

"use client";

import { motion } from "framer-motion";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Activity, RefreshCw } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

interface Kline {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Ticker {
  symbol: string;
  lastPrice: string;
  priceChange24h: string;
  volume24h: string;
  highPrice24h: string;
  lowPrice24h: string;
  isMock?: boolean;
}

interface ChartPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema9: number;
  ema21: number;
}

function calcEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [];
  data.forEach((v, i) => {
    if (i === 0) { ema.push(v); }
    else         { ema.push(v * k + ema[i - 1] * (1 - k)); }
  });
  return ema;
}

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return parseFloat((100 - 100 / (1 + rs)).toFixed(1));
}

const SYMBOLS = ["MNTUSDT", "ETHUSDT", "BTCUSDT"];

// ─── Premium tooltip ──────────────────────────────────────────────────────────

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: "rgba(10,15,31,0.97)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        padding: "12px 16px",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.65)",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 9, letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 18px" }}>
        {[
          { k: "O", v: d.open.toFixed(4),  c: "rgba(255,255,255,0.90)" },
          { k: "H", v: d.high.toFixed(4),  c: "#00E5A8"                },
          { k: "C", v: d.close.toFixed(4), c: "rgba(255,255,255,0.90)" },
          { k: "L", v: d.low.toFixed(4),   c: "#EF4444"                },
        ].map(({ k, v, c }) => (
          <span key={k} style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)" }}>
            {k}{" "}
            <span style={{ color: c, fontWeight: 600 }}>{v}</span>
          </span>
        ))}
      </div>
      {d.ema9 > 0 && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 14 }}>
          <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.35)" }}>
            EMA9 <span style={{ color: "#00E5A8" }}>{d.ema9.toFixed(4)}</span>
          </span>
          <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.35)" }}>
            EMA21 <span style={{ color: "#a78bfa" }}>{d.ema21.toFixed(4)}</span>
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Panel ────────────────────────────────────────────────────────────────────

export function TradingPanel() {
  const [symbol, setSymbol] = useState("MNTUSDT");
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trading?symbol=${symbol}&interval=15`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const klines: Kline[] = data.klines || [];
      const closes = klines.map((k) => k.close);
      const ema9s  = calcEMA(closes, 9);
      const ema21s = calcEMA(closes, 21);

      const points: ChartPoint[] = klines.map((k, i) => {
        const d = new Date(k.timestamp);
        const h = d.getHours().toString().padStart(2, "0");
        const m = d.getMinutes().toString().padStart(2, "0");
        return {
          time: `${h}:${m}`,
          open: k.open, high: k.high, low: k.low, close: k.close, volume: k.volume,
          ema9:  parseFloat(ema9s[i].toFixed(5)),
          ema21: parseFloat(ema21s[i].toFixed(5)),
        };
      });

      setChartData(points.slice(-24));
      setTicker(data.ticker || null);
      setIsMock(!!data.isMock);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const closes    = chartData.map((d) => d.close);
  const rsi       = calcRSI(closes);
  const lastEma9  = chartData.length > 1 ? chartData[chartData.length - 1].ema9  : 0;
  const lastEma21 = chartData.length > 1 ? chartData[chartData.length - 1].ema21 : 0;
  const emaBull   = lastEma9 > lastEma21;
  const lastClose = closes.length > 0 ? closes[closes.length - 1] : 0;
  const prevClose = closes.length > 1 ? closes[closes.length - 2] : lastClose;

  const signalType  = rsi < 35 && emaBull ? "BUY" : rsi > 65 && !emaBull ? "SELL" : "HOLD";
  const signalColor = signalType === "BUY" ? "#00E5A8" : signalType === "SELL" ? "#EF4444" : "#F59E0B";
  const SignalIcon  = signalType === "BUY" ? TrendingUp : signalType === "SELL" ? TrendingDown : Minus;

  const priceChange = lastClose && prevClose ? (((lastClose - prevClose) / prevClose) * 100).toFixed(2) : "0";
  const currentPrice = ticker?.lastPrice
    ? parseFloat(ticker.lastPrice).toFixed(symbol === "BTCUSDT" ? 1 : symbol === "ETHUSDT" ? 2 : 5)
    : lastClose.toFixed(5);
  const change24h = ticker?.priceChange24h ? parseFloat(ticker.priceChange24h).toFixed(2) : priceChange;

  const axisStyle = { fill: "rgba(255,255,255,0.25)", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div className="card" style={{ padding: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <h2 style={{ fontFamily: "var(--ui)", fontWeight: 700, color: "var(--t1)", display: "flex", alignItems: "center", gap: 8 }}>
          <Activity style={{ width: 15, height: 15, color: "var(--teal)" }} />
          AI Trading
          {isMock && (
            <span style={{ fontFamily: "var(--mono)", fontSize: 8, padding: "2px 7px", borderRadius: 20, background: "rgba(245,158,11,0.10)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.25)" }}>
              DEMO
            </span>
          )}
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              padding: "5px 10px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.65)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.5)",
              color: "var(--t2)",
              outline: "none",
              cursor: "pointer",
            }}
          >
            {SYMBOLS.map((s) => (
              <option key={s} value={s} style={{ background: "#030712" }}>
                {s.replace("USDT", "/USDT")}
              </option>
            ))}
          </select>
          <button
            onClick={fetchData}
            disabled={isLoading}
            style={{
              padding: "5px",
              borderRadius: 8,
              background: "none",
              border: "none",
              color: "var(--t3)",
              cursor: "pointer",
              transition: "color 0.2s",
            }}
          >
            <RefreshCw style={{ width: 13, height: 13, animation: isLoading ? "spin 1s linear infinite" : "none" }} />
          </button>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 12px",
              borderRadius: 20,
              fontFamily: "var(--ui)",
              fontSize: 11,
              fontWeight: 700,
              background: `${signalColor}12`,
              color: signalColor,
              border: `1px solid ${signalColor}28`,
            }}
          >
            <SignalIcon style={{ width: 11, height: 11 }} />
            {signalType}
          </span>
        </div>
      </div>

      {/* Price ticker */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 28, fontWeight: 600, color: "var(--t1)", letterSpacing: "-0.03em" }}>
          ${currentPrice}
        </span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 600, color: parseFloat(change24h) >= 0 ? "#00E5A8" : "#EF4444" }}>
          {parseFloat(change24h) >= 0 ? "+" : ""}{change24h}%
        </span>
        <span style={{ fontFamily: "var(--ui)", fontSize: 11, color: "var(--t3)" }}>24h</span>
        {isLoading && <span style={{ fontFamily: "var(--ui)", fontSize: 11, color: "var(--t3)" }}>refreshing…</span>}
      </div>

      {error && (
        <div style={{ marginBottom: 14, fontFamily: "var(--mono)", fontSize: 10, color: "#EF4444", padding: "8px 12px", borderRadius: 10, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)" }}>
          {error} — showing cached data
        </div>
      )}

      {/* Chart — always dark surface inside white card */}
      <div className="dark-chart" style={{ marginBottom: 18, overflow: "hidden", padding: "18px 12px 12px" }}>
        {isLoading && chartData.length === 0 ? (
          <div
            style={{
              height: 280,
              borderRadius: 16,
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.035) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.035) 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.6s infinite",
            }}
          />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 6, right: 6, bottom: 4, left: -18 }}>
              <CartesianGrid
                stroke="rgba(255,255,255,0.055)"
                strokeDasharray="4 8"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                interval={Math.floor(chartData.length / 6)}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v.toFixed(symbol === "BTCUSDT" ? 0 : symbol === "ETHUSDT" ? 1 : 4)}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }} />
              <Bar dataKey="close" fill="#00E5A8" opacity={0.34} radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="ema9"  stroke="#00E5A8" strokeWidth={2}   dot={false} />
              <Line type="monotone" dataKey="ema21" stroke="#8B5CF6" strokeWidth={2}   dot={false} strokeDasharray="4 3" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Indicators */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
        {[
          {
            label: "RSI(14)",
            value: String(rsi),
            sub: rsi < 30 ? "OVERSOLD" : rsi > 70 ? "OVERBOUGHT" : "NEUTRAL",
            color: rsi < 30 ? "#00E5A8" : rsi > 70 ? "#EF4444" : "#F59E0B",
          },
          {
            label: "EMA Cross",
            value: emaBull ? "BULL" : "BEAR",
            sub: emaBull ? "9 > 21" : "9 < 21",
            color: emaBull ? "#00E5A8" : "#EF4444",
          },
          {
            label: "24h Vol",
            value: ticker?.volume24h
              ? parseFloat(ticker.volume24h).toLocaleString(undefined, { maximumFractionDigits: 0 })
              : "—",
            sub: "USDT",
            color: "var(--t1)",
          },
        ].map((ind) => (
          <div
            key={ind.label}
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              textAlign: "center",
              background: "var(--card2-bg)",
              border: "1px solid var(--b1)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
            }}
          >
            <div style={{ fontFamily: "var(--ui)", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--t3)", marginBottom: 7 }}>
              {ind.label}
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 17, fontWeight: 600, color: ind.color, letterSpacing: "-0.02em", marginBottom: 3 }}>
              {ind.value}
            </div>
            <div style={{ fontFamily: "var(--ui)", fontSize: 9, color: "var(--t3)" }}>{ind.sub}</div>
          </div>
        ))}
      </div>

      {/* Recent candles */}
      <div>
        <div style={{ fontFamily: "var(--ui)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--t3)", marginBottom: 10 }}>
          Recent Candles (15m)
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {chartData.slice(-5).reverse().map((candle, i) => {
            const bullish = candle.close >= candle.open;
            const chg = candle.open > 0 ? (((candle.close - candle.open) / candle.open) * 100).toFixed(2) : "0";
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 11,
                  padding: "8px 12px",
                  borderRadius: 10,
                  background: "var(--card2-bg)",
                  border: "1px solid var(--b1)",
                }}
              >
                <span style={{ fontFamily: "var(--mono)", color: "var(--t3)", width: 40, flexShrink: 0, fontSize: 10 }}>
                  {candle.time}
                </span>
                <span style={{ fontFamily: "var(--mono)", width: 18, color: bullish ? "#00E5A8" : "#EF4444" }}>
                  {bullish ? "▲" : "▼"}
                </span>
                <span style={{ fontFamily: "var(--mono)", color: "var(--t2)", flex: 1, fontSize: 10 }}>
                  O:{candle.open.toFixed(4)} H:{candle.high.toFixed(4)}
                </span>
                <span style={{ fontFamily: "var(--mono)", color: "var(--t1)", fontSize: 10 }}>
                  ${candle.close.toFixed(4)}
                </span>
                <span style={{ fontFamily: "var(--mono)", fontWeight: 600, fontSize: 10, color: bullish ? "#00E5A8" : "#EF4444" }}>
                  {bullish ? "+" : ""}{chg}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

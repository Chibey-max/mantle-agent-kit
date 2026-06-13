"use client";

import { motion } from "framer-motion";
import { FileText, ExternalLink, Filter, Download, CheckCircle, XCircle, ArrowUpRight, TrendingUp, Layers, Shield, RefreshCw } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { getContractAddresses } from "@/lib/config";

type ActionType = "all" | "transfer" | "trade" | "stake" | "identity" | "error" | "admin";

interface AuditEvent {
  id: string;
  blockNumber: string;
  txHash: string;
  timestamp: number;
  eventName: string;
  actionType: "transfer" | "trade" | "stake" | "identity" | "error" | "admin";
  description: string;
  success: boolean;
  source: "wallet" | "identity";
}

const actionIcons: Record<Exclude<ActionType, "all">, React.ReactNode> = {
  transfer: <ArrowUpRight className="w-3.5 h-3.5" />,
  trade:    <TrendingUp   className="w-3.5 h-3.5" />,
  stake:    <Layers       className="w-3.5 h-3.5" />,
  identity: <FileText     className="w-3.5 h-3.5" />,
  error:    <XCircle      className="w-3.5 h-3.5" />,
  admin:    <Shield       className="w-3.5 h-3.5" />,
};

const actionColors: Record<Exclude<ActionType, "all">, string> = {
  transfer: "#00d4aa",
  trade:    "#7c3aed",
  stake:    "#f59e0b",
  identity: "#06b6d4",
  error:    "#ef4444",
  admin:    "#94a3b8",
};

function formatTs(ts: number) {
  if (!ts) return "—";
  const d = new Date(ts * 1000);
  return d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

function exportCsv(events: AuditEvent[]) {
  const header = "timestamp,eventName,actionType,description,txHash,success,blockNumber\n";
  const rows = events.map((e) =>
    [formatTs(e.timestamp), e.eventName, e.actionType, `"${e.description.replace(/"/g, "'")}"`, e.txHash, e.success, e.blockNumber].join(",")
  );
  const csv = header + rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mantle-audit-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AuditTrailPanel() {
  const [filter, setFilter] = useState<ActionType>("all");
  const [events, setEvents]     = useState<AuditEvent[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState(0);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const addrs = getContractAddresses();
      const wallet   = addrs?.walletAddress   || process.env.NEXT_PUBLIC_AGENT_CONTRACT_ADDRESS    || "";
      const identity = addrs?.identityAddress || process.env.NEXT_PUBLIC_IDENTITY_CONTRACT_ADDRESS || "";
      // Skip fetch if we have no real addresses
      if (!wallet || !identity) { setLoading(false); return; }
      const params = new URLSearchParams({ wallet, identity });
      const res = await fetch(`/api/events?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setEvents(data.events ?? []);
      setLastFetch(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // auto-refresh every 5 min (RPC scan takes ~60-90s for 50k blocks)
  useEffect(() => {
    const id = setInterval(fetchEvents, 300_000);
    return () => clearInterval(id);
  }, [fetchEvents]);

  const FILTER_TYPES: ActionType[] = ["all", "transfer", "identity", "admin", "error"];
  const filtered = filter === "all" ? events : events.filter((e) => e.actionType === filter);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-[var(--color-green)]" />
          Audit Trail
          {events.length > 0 && (
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: "rgba(0,212,170,0.1)", color: "var(--color-green)", border: "1px solid rgba(0,212,170,0.2)" }}
            >
              {events.length} live
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchEvents}
            disabled={loading}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/5 disabled:opacity-40"
            title="Refresh events"
            style={{ color: "var(--color-text-muted)" }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => exportCsv(filtered)}
            disabled={filtered.length === 0}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors hover:bg-white/5 disabled:opacity-40"
            style={{ color: "var(--color-text-muted)", background: "rgba(255,255,255,0.04)" }}
          >
            <Download className="w-3 h-3" />
            CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {FILTER_TYPES.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide transition-all"
            style={{
              background: filter === f ? (f === "all" ? "rgba(0,212,170,0.15)" : `${actionColors[f as Exclude<ActionType, "all">]}15`) : "rgba(255,255,255,0.04)",
              border: `1px solid ${filter === f ? (f === "all" ? "rgba(0,212,170,0.3)" : `${actionColors[f as Exclude<ActionType, "all">]}30`) : "rgba(255,255,255,0.06)"}`,
              color: filter === f ? (f === "all" ? "var(--color-green)" : actionColors[f as Exclude<ActionType, "all">]) : "var(--color-text-muted)",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && events.length === 0 ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="loading-shimmer w-5 h-5 rounded-full flex-shrink-0" />
              <div className="flex-1 loading-shimmer rounded-xl h-14" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div
          className="text-xs px-3 py-2 rounded-xl"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}
        >
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="text-xs text-center py-8"
          style={{ color: "var(--color-text-muted)" }}
        >
          No {filter !== "all" ? filter : ""} events found in the last 200 000 blocks.
        </div>
      ) : (
        /* Timeline */
        <div className="space-y-2 relative max-h-[420px] overflow-y-auto pr-1">
          <div
            className="absolute left-[17px] top-0 bottom-0 w-px pointer-events-none"
            style={{ background: "linear-gradient(to bottom, rgba(0,212,170,0.3), transparent)" }}
          />
          {filtered.map((entry, i) => {
            const color = entry.success ? actionColors[entry.actionType] : "#ef4444";
            const explorerBase = "https://explorer.sepolia.mantle.xyz";
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="flex gap-3 relative pl-1"
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 relative z-10 mt-1"
                  style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
                >
                  {entry.success ? actionIcons[entry.actionType] : <XCircle className="w-3 h-3" />}
                </div>

                <div
                  className="flex-1 p-2.5 rounded-xl min-w-0"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="text-xs text-[var(--color-text-secondary)] leading-snug flex-1 break-words">
                      {entry.description}
                    </div>
                    {entry.success ? (
                      <CheckCircle className="w-3 h-3 text-[var(--color-green)] flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
                    <span className="text-[var(--color-text-muted)] font-mono">{formatTs(entry.timestamp)}</span>
                    <a
                      href={`${explorerBase}/tx/${entry.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-0.5 font-mono hover:text-[var(--color-green)] transition-colors"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {entry.txHash.slice(0, 10)}…{entry.txHash.slice(-6)}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <span
                      className="px-1 py-0.5 rounded text-[9px] uppercase font-semibold"
                      style={{ background: `${color}15`, color }}
                    >
                      {entry.eventName}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {lastFetch > 0 && (
        <div className="mt-3 text-[10px] font-mono text-right" style={{ color: "var(--color-text-muted)" }}>
          Last synced {new Date(lastFetch).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · Mantle Sepolia
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brain, Zap, TrendingUp, TrendingDown, Shield,
  Activity, BarChart3, Cpu, Target, AlertCircle,
  Bot, Fingerprint, Layers, Settings, TerminalSquare,
} from "lucide-react";

import { TradingPanel }         from "@/components/panels/TradingPanel";
import { IdentityPanel }        from "@/components/panels/IdentityPanel";
import { SkillsPanel }          from "@/components/panels/SkillsPanel";
import { YieldPanel }           from "@/components/panels/YieldPanel";
import { SpendingLimitsPanel }  from "@/components/panels/SpendingLimitsPanel";
import { TokenPolicyPanel }     from "@/components/panels/TokenPolicyPanel";
import { AgentChatPanel }       from "@/components/panels/AgentChatPanel";
import { GuardianControlPanel } from "@/components/panels/GuardianControlPanel";
import { AuditTrailPanel }      from "@/components/panels/AuditTrailPanel";
import { ContractConfigPanel }  from "@/components/shared/ContractConfigPanel";

import {
  useAgentIdentity,
  useWalletState,
  useSpendingLimits,
  MANTLE_TOKENS,
} from "@/hooks/useContractState";
import { getContractAddresses } from "@/lib/config";

type Page = "trading" | "identity" | "agent" | "defi";

// ─── Motion variants ──────────────────────────────────────────────────────────
const slideInLeft = { hidden: { x: -20, opacity: 0 }, show: { x: 0, opacity: 1 } };
const slideInDown = { hidden: { y: -14, opacity: 0 }, show: { y: 0, opacity: 1 } };
const statFade    = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };
const stagger     = { show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } } };
const itemFade    = { hidden: { opacity: 0, x: -6 }, show: { opacity: 1, x: 0 } };

// ─── Shared style helpers ─────────────────────────────────────────────────────
const LABEL: React.CSSProperties = {
  fontFamily: "var(--ui)",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: "var(--t3)",
};
const MONO: React.CSSProperties = {
  fontFamily: "var(--mono)",
  fontWeight: 600,
  letterSpacing: "-0.02em",
  lineHeight: 1,
};

// ─── Nav data ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "trading",  icon: BarChart3,    label: "Trading",       badge: "LIVE" },
  { id: "identity", icon: Fingerprint,  label: "Identity",      badge: null   },
  { id: "defi",     icon: Layers,       label: "DeFi & Yield",  badge: null   },
  { id: "agent",    icon: Bot,          label: "Agent",         badge: null   },
] as const;

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ active, onNav, walletShort }: {
  active: Page; onNav: (p: Page) => void; walletShort: string;
}) {
  return (
    <motion.aside
      variants={slideInLeft}
      initial="hidden"
      animate="show"
      transition={{ duration: 0.40, ease: [0.22, 0.68, 0, 1.15] }}
      style={{
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
        padding: "20px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        overflowY: "auto",
      }}
    >
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        style={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <div style={{ ...LABEL, padding: "8px 10px 8px" }}>Navigation</div>

        {NAV_ITEMS.map((item) => {
          const isOn = active === item.id;
          const Icon = item.icon;
          return (
            <motion.button
              key={item.id}
              variants={itemFade}
              transition={{ duration: 0.26 }}
              whileHover={{ x: 2, transition: { duration: 0.14 } }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onNav(item.id as Page)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "11px 12px",
                borderRadius: 16,
                cursor: "pointer",
                fontSize: 13.5,
                fontFamily: "var(--ui)",
                fontWeight: isOn ? 600 : 500,
                color: isOn ? "#0F172A" : "var(--t2)",
                background: isOn ? "linear-gradient(135deg, rgba(0,229,168,0.20), rgba(255,255,255,0.92))" : "transparent",
                border: `1px solid ${isOn ? "var(--tb)" : "transparent"}`,
                boxShadow: isOn ? "0 8px 20px rgba(0,229,168,0.12), inset 3px 0 0 #00E5A8" : "none",
                transition: "all 0.18s ease",
                textAlign: "left",
                width: "100%",
              }}
            >
              <Icon style={{ width: 16, height: 16, flexShrink: 0, color: isOn ? "var(--teal-text)" : "var(--t3)" }} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <motion.span
                  animate={{ opacity: [0.55, 1, 0.55] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 7.5,
                    padding: "2px 6px",
                    borderRadius: 20,
                    background: "var(--td)",
                    border: "1px solid var(--tb)",
                    color: "var(--teal-text)",
                    letterSpacing: "0.06em",
                  }}
                >
                  {item.badge}
                </motion.span>
              )}
            </motion.button>
          );
        })}

        <div style={{ ...LABEL, padding: "16px 10px 8px" }}>System</div>

        {[
          { icon: Shield,         label: "Guardian",    target: "agent"    as Page },
          { icon: Settings,       label: "Skills",      target: "identity" as Page },
          { icon: TerminalSquare, label: "Audit Trail", target: "agent"    as Page },
        ].map((item) => (
          (() => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.label}
                variants={itemFade}
                transition={{ duration: 0.26 }}
                whileHover={{ x: 2, transition: { duration: 0.14 } }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onNav(item.target)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontSize: 13.5,
                  fontFamily: "var(--ui)",
                  fontWeight: 500,
                  color: "var(--t2)",
                  background: "transparent",
                  border: "1px solid transparent",
                  transition: "all 0.18s ease",
                  textAlign: "left",
                  width: "100%",
                }}
              >
                <Icon style={{ width: 15, height: 15, flexShrink: 0, color: "var(--t3)" }} />
                {item.label}
              </motion.button>
            );
          })()
        ))}
      </motion.div>

      {/* Agent wallet footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.42, duration: 0.36 }}
        style={{ marginTop: "auto", paddingTop: 14, borderTop: "1px solid var(--b1)" }}
      >
        <div
          style={{
            background: "var(--s1)",
            border: "1px solid var(--b1)",
            borderRadius: 14,
            padding: "12px 14px",
          }}
        >
          <div style={{ ...LABEL, marginBottom: 6 }}>Agent Wallet</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--teal-text)", fontWeight: 600 }}>
            {walletShort || "0x013b…d0deF"}
          </div>
        </div>
      </motion.div>
    </motion.aside>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar({ active, onNav, theme, toggleTheme }: {
  active: Page; onNav: (p: Page) => void; theme: "dark" | "light"; toggleTheme: () => void;
}) {
  const { address, isConnected } = useAccount();
  const { connect }    = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const pages: { id: Page; label: string }[] = [
    { id: "trading",  label: "Trading"  },
    { id: "identity", label: "Identity" },
    { id: "agent",    label: "Agent"    },
    { id: "defi",     label: "DeFi"     },
  ];
  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

  return (
    <motion.header
      variants={slideInDown}
      initial="hidden"
      animate="show"
      transition={{ duration: 0.36, ease: [0.22, 0.68, 0, 1.15] }}
      style={{
        gridColumn: "1 / -1",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background: "var(--topbar-bg)",
        borderBottom: "1px solid var(--topbar-border)",
        backdropFilter: "var(--blur)",
        WebkitBackdropFilter: "var(--blur)",
        boxShadow: "var(--sh2)",
      }}
    >
      {/* Left */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.32 }}
          style={{ fontFamily: "var(--sans)", fontSize: 16, fontWeight: 700, letterSpacing: "-0.04em", color: "var(--t1)" }}
        >
          MANTLE<span style={{ color: "var(--teal)" }}>/</span>AGENT
        </motion.div>

        {/* Tab nav */}
        <nav
          style={{
            display: "flex",
            gap: 2,
            background: "var(--s2)",
            border: "1px solid var(--b1)",
            borderRadius: 18,
            padding: "3px",
          }}
        >
          {pages.map((p, i) => {
            const isOn = active === p.id;
            return (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.10 + i * 0.05, duration: 0.28 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onNav(p.id)}
                style={{
                  fontFamily: "var(--ui)",
                  fontSize: 13,
                  fontWeight: isOn ? 600 : 500,
                  padding: "6px 16px",
                  borderRadius: 14,
                  color: isOn ? (theme === "dark" ? "#000" : "#fff") : "var(--t2)",
                  background: isOn ? "var(--teal)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.22s ease",
                  boxShadow: isOn ? "0 2px 10px rgba(0,229,168,0.28)" : "none",
                  letterSpacing: "0.01em",
                }}
              >
                {p.label}
              </motion.button>
            );
          })}
        </nav>
      </div>

      {/* Right */}
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.24, duration: 0.32 }}
        style={{ display: "flex", alignItems: "center", gap: 8 }}
      >
        {/* Chain pill */}
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            padding: "4px 11px",
            borderRadius: 20,
            border: "1px solid var(--tb)",
            color: "var(--teal-text)",
            background: "var(--td)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <div className="live-dot" style={{ width: 5, height: 5 }} />
          Sepolia · 5003
        </div>

        {/* Wallet */}
        {mounted && (
          isConnected && address ? (
            <motion.button
              whileHover={{ borderColor: "var(--b2)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => disconnect()}
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                padding: "4px 11px",
                borderRadius: 10,
                border: "1px solid var(--b1)",
                color: "var(--t2)",
                background: "var(--s1)",
                cursor: "pointer",
                transition: "border-color 0.18s",
              }}
              title="Disconnect"
            >
              {short}
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => connect({ connector: injected() })}
              style={{
                fontFamily: "var(--ui)",
                fontSize: 12,
                fontWeight: 600,
                padding: "5px 16px",
                borderRadius: 10,
                border: "1px solid var(--tb)",
                color: theme === "dark" ? "#000" : "#fff",
                background: "var(--teal)",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,229,168,0.25)",
              }}
            >
              Connect
            </motion.button>
          )
        )}

        {/* ERC-8004 */}
        <div
          style={{
            fontFamily: "var(--ui)",
            fontSize: 10,
            fontWeight: 600,
            padding: "4px 11px",
            borderRadius: 10,
            border: "1px solid var(--pb)",
            color: "var(--purple)",
            background: "var(--pd)",
            letterSpacing: "0.04em",
          }}
        >
          ERC-8004
        </div>

        {/* Theme toggle */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={toggleTheme}
          aria-label="Toggle theme"
          style={{
            width: 42,
            height: 23,
            borderRadius: 12,
            border: "1px solid var(--b2)",
            background: "var(--s2)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            padding: "3px",
            transition: "background 0.22s",
          }}
        >
          <motion.div
            animate={{ x: theme === "light" ? 18 : 0 }}
            transition={{ type: "spring", stiffness: 440, damping: 28 }}
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "var(--teal)",
              boxShadow: "0 0 6px var(--teal)",
            }}
          />
        </motion.button>
      </motion.div>
    </motion.header>
  );
}

// ─── Live Stats ───────────────────────────────────────────────────────────────
function LiveStats() {
  const [mounted, setMounted] = useState(false);
  const [walletAddr,   setWalletAddr]   = useState<`0x${string}` | undefined>();
  const [identityAddr, setIdentityAddr] = useState<`0x${string}` | undefined>();

  useEffect(() => {
    setMounted(true);
    const a = getContractAddresses();
    if (a?.walletAddress?.startsWith("0x"))   setWalletAddr(a.walletAddress as `0x${string}`);
    if (a?.identityAddress?.startsWith("0x")) setIdentityAddr(a.identityAddress as `0x${string}`);
  }, []);

  const { mntBalance, isLoading: wLoad }                 = useWalletState(walletAddr);
  const { dailyRemaining, dailyLimit, isLoading: lLoad } = useSpendingLimits(walletAddr, MANTLE_TOKENS.MNT);
  const { reputation, tokenId, isLoading: iLoad }        = useAgentIdentity(identityAddr, walletAddr);

  const remPct = dailyLimit > 0 ? `${((dailyRemaining / dailyLimit) * 100).toFixed(0)}% remaining` : "not set";
  const hasId  = mounted && tokenId > 0 && tokenId < 10_000_000;

  const stats = [
    { label: "MNT Balance",     icon: <BarChart3 size={13} />, value: wLoad ? null : mntBalance,                      unit: "MNT",  sub: "● live on-chain",                           pos: true  },
    { label: "Daily Remaining", icon: <Target size={13} />,    value: lLoad ? null : dailyRemaining.toFixed(2),        unit: "MNT",  sub: remPct,                                      pos: true  },
    { label: "Open Positions",  icon: <Activity size={13} />,  value: "3",                                              unit: "",     sub: "+1 opened today",                           pos: true  },
    { label: "Reputation",      icon: <Shield size={13} />,    value: iLoad ? null : hasId ? String(reputation) : "—", unit: hasId ? "pts" : "", sub: hasId ? `ERC-8004 #${tokenId}` : "no identity", pos: false },
  ];

  return (
    <motion.div
      variants={{ show: { transition: { staggerChildren: 0.07 } } }}
      initial="hidden"
      animate="show"
      style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}
    >
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          variants={statFade}
          transition={{ duration: 0.34, ease: [0.22, 0.68, 0, 1.15], delay: i * 0.06 }}
          className="card"
          style={{ padding: "20px 22px" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
            <span style={{ color: "var(--teal)" }}>{s.icon}</span>
            <span style={{ ...LABEL }}>{s.label}</span>
          </div>
          {s.value === null ? (
            <div className="loading-shimmer" style={{ height: 26, width: 80, borderRadius: 6, marginBottom: 8 }} />
          ) : (
            <motion.div
              key={s.value}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
              style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 6 }}
            >
              <span style={{ ...MONO, fontSize: 26, color: "var(--t1)" }}>{s.value}</span>
              {s.unit && <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--t3)", fontWeight: 500 }}>{s.unit}</span>}
            </motion.div>
          )}
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: s.pos ? "var(--teal-text)" : "var(--t3)" }}>
            {s.sub}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── Config Toggle ────────────────────────────────────────────────────────────
function ConfigSection() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen((o) => !o)}
        style={{
          fontFamily: "var(--ui)",
          fontSize: 11,
          fontWeight: 500,
          padding: "5px 14px",
          borderRadius: 10,
          border: "1px solid var(--b1)",
          color: "var(--t3)",
          background: "var(--card-bg)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 7,
          transition: "border-color 0.18s, color 0.18s",
          boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
          marginBottom: open ? 10 : 0,
        }}
      >
          <Settings size={12} /> Contract Config {open ? "▲" : "▼"}
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 0.68, 0, 1.15] }}
            style={{ overflow: "hidden" }}
          >
            <ContractConfigPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page Header ──────────────────────────────────────────────────────────────
function PageHeader({ title, sub, badge, badgeColor = "teal" }: {
  title: string; sub: string; badge?: string; badgeColor?: "teal" | "purple";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
      style={{ marginBottom: 28, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}
    >
      <div>
        <h1 style={{
          fontFamily: "var(--sans)",
          fontSize: 40,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          color: "var(--t1)",
          lineHeight: 1.05,
          marginBottom: 8,
        }}>
          {title}
        </h1>
        <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--t3)", lineHeight: 1.5 }}>
          {sub}
        </p>
      </div>
      {badge && (
        <span style={{
          fontFamily: "var(--ui)",
          fontSize: 10,
          fontWeight: 600,
          padding: "5px 14px",
          borderRadius: 20,
          border: `1px solid ${badgeColor === "teal" ? "var(--tb)" : "var(--pb)"}`,
          color: badgeColor === "teal" ? "var(--teal-text)" : "var(--purple)",
          background: badgeColor === "teal" ? "var(--td)" : "var(--pd)",
          flexShrink: 0,
          marginTop: 6,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}>
          {badge}
        </span>
      )}
    </motion.div>
  );
}

// ─── AI Strategy Engine ───────────────────────────────────────────────────────
const AGENT_STATES = [
  { label: "ONLINE",     color: "#00E5A8", textColor: "#0D9488", bg: "rgba(0,229,168,0.08)", border: "rgba(0,229,168,0.22)" },
  { label: "THINKING",   color: "#8B5CF6", textColor: "#6D28D9", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.22)" },
  { label: "EXECUTING",  color: "#00E5A8", textColor: "#0D9488", bg: "rgba(0,229,168,0.08)", border: "rgba(0,229,168,0.22)" },
  { label: "PAUSED",     color: "#F59E0B", textColor: "#92400E", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.22)" },
] as const;

function StrategyEngine() {
  const [stateIdx, setStateIdx] = useState(2);
  useEffect(() => {
    const id = setInterval(() => setStateIdx((i) => (i + 1) % AGENT_STATES.length), 7000);
    return () => clearInterval(id);
  }, []);

  const agentState = AGENT_STATES[stateIdx];

  const signals = [
    { label: "RSI(14)",    value: "42.3",  sub: "Neutral zone",   color: "#F59E0B",   icon: <BarChart3 size={12} /> },
    { label: "EMA Cross",  value: "BULL",  sub: "9 above 21",     color: "#0D9488",   icon: <TrendingUp size={12} /> },
    { label: "Confidence", value: "74%",   sub: "Buy signal",     color: "#0D9488",   icon: <Cpu size={12} /> },
    { label: "Risk Score", value: "LOW",   sub: "0.8σ exposure",  color: "#0D9488",   icon: <AlertCircle size={12} /> },
  ];

  return (
    <div className="card" style={{ padding: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Brain size={14} style={{ color: "var(--teal)" }} />
        <span style={{ ...LABEL }}>Strategy Engine</span>
        <span className="glass-sm" style={{ ...LABEL, marginLeft: "auto", color: "var(--t2)", padding: "5px 10px", borderRadius: 999 }}>AI Command Center</span>
      </div>

      {/* Animated agent status */}
      <motion.div
        key={agentState.label}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.28 }}
        style={{
          marginBottom: 20,
          padding: "12px 16px",
          background: agentState.bg,
          border: `1px solid ${agentState.border}`,
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div className="live-dot" style={{ background: agentState.color }} />
        <span style={{ fontFamily: "var(--ui)", fontSize: 12, fontWeight: 700, color: agentState.textColor, letterSpacing: "0.05em" }}>
          {agentState.label}
        </span>
        <Zap size={11} style={{ color: agentState.color, marginLeft: "auto", opacity: 0.7 }} />
      </motion.div>

      {/* Signal grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {signals.map((s) => (
          <div
            key={s.label}
            style={{
              background: "var(--s1)",
              border: "1px solid var(--b1)",
              borderRadius: 14,
              padding: "14px 16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 9 }}>
              <span style={{ color: s.color }}>{s.icon}</span>
              <span style={{ ...LABEL }}>{s.label}</span>
            </div>
            <div style={{ ...MONO, fontSize: 20, color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontFamily: "var(--ui)", fontSize: 10, color: "var(--t3)" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Position allocation */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ ...LABEL }}>Position Allocation</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--teal-text)", fontWeight: 600 }}>12%</span>
        </div>
        <div style={{ height: 5, background: "var(--s2)", borderRadius: 4, overflow: "hidden" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "12%" }}
            transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }}
            style={{ height: "100%", background: "linear-gradient(90deg, #00E5A8, #14B8A6)", borderRadius: 4 }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--t3)" }}>0%</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--t3)" }}>Max 25%</span>
        </div>
      </div>
    </div>
  );
}

// ─── Execution Feed ───────────────────────────────────────────────────────────
const FEED = [
  { time: "14:32:01", action: "BUY MNT",        asset: "MNT/USDT",  amount: "0.500", status: "EXECUTED", conf: "87%", tool: "Trading",  green: true  },
  { time: "14:28:44", action: "SELL ETH",       asset: "ETH/USDT",  amount: "0.010", status: "PENDING",  conf: "72%", tool: "Strategy", green: false },
  { time: "14:15:22", action: "STOP LOSS",      asset: "ETH",       amount: "0.010", status: "EXECUTED", conf: "95%", tool: "Risk",     green: true  },
  { time: "13:55:10", action: "TAKE PROFIT",    asset: "MNT",       amount: "2.000", status: "EXECUTED", conf: "81%", tool: "Trading",  green: true  },
  { time: "13:42:08", action: "OPEN POSITION",  asset: "MNT/USDT",  amount: "1.200", status: "EXECUTED", conf: "69%", tool: "Market",   green: true  },
  { time: "13:34:19", action: "CLAIM REWARDS",  asset: "mETH",      amount: "0.042", status: "QUEUED",   conf: "78%", tool: "Yield",    green: false },
];

function ExecutionFeed() {
  return (
    <div className="card" style={{ padding: "24px", flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Activity size={13} style={{ color: "var(--teal)" }} />
          <span style={{ ...LABEL }}>Execution Feed</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div className="live-dot" style={{ width: 5, height: 5 }} />
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--t3)", letterSpacing: "0.08em" }}>LIVE</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {FEED.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{
              display: "grid",
              gridTemplateColumns: "46px minmax(0,1fr) 30px 68px",
              alignItems: "center",
              gap: 7,
              padding: "9px 10px",
              borderRadius: 11,
              background: "var(--s1)",
              border: "1px solid transparent",
              transition: "border-color 0.15s",
              minWidth: 0,
            }}
          >
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--t3)", width: 46, flexShrink: 0, letterSpacing: "0.02em" }}>
              {item.time}
            </span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 700, color: item.green ? "#0D9488" : "#92400E", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.action}
            </span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--t3)", width: 30, textAlign: "right" }}>
              {item.conf}
            </span>
            <span style={{
              fontFamily: "var(--ui)",
              fontSize: 8.5,
              fontWeight: 600,
              padding: "2px 0",
              borderRadius: 20,
              letterSpacing: "0.05em",
              background: item.green ? "rgba(0,229,168,0.09)" : "rgba(245,158,11,0.09)",
              color: item.green ? "#0D9488" : "#92400E",
              border: `1px solid ${item.green ? "rgba(0,229,168,0.22)" : "rgba(245,158,11,0.22)"}`,
              width: 68,
              textAlign: "center",
              boxSizing: "border-box",
              overflow: "hidden",
            }}>
              {item.status}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── AI Insights ──────────────────────────────────────────────────────────────
function AIInsights() {
  const cards = [
    {
      icon: <Brain size={14} />,
      label: "Market Summary",
      content: "Neutral sentiment across MNT pairs. Volume increasing 12% — accumulation pattern emerging near support.",
      foot: "Updated 2m ago",
      footColor: "var(--teal-text)",
    },
    {
      icon: <TrendingUp size={14} />,
      label: "Trend Analysis",
      big: "BULLISH",
      bigColor: "#0D9488",
      foot: "↑ EMA structure healthy on H1",
      footColor: "#0D9488",
    },
    {
      icon: <AlertCircle size={14} />,
      label: "Risk Forecast",
      big: "LOW",
      bigColor: "#16A34A",
      foot: "Risk score: 24/100",
      footColor: "var(--t3)",
    },
    {
      icon: <Zap size={14} />,
      label: "Suggested Action",
      content: "Maintain current allocation. No rebalance required. DCA opportunity on next 2% dip.",
      foot: "AI confidence: 74%",
      footColor: "var(--purple)",
    },
  ];

  return (
    <motion.div
      variants={{ show: { transition: { staggerChildren: 0.07 } } }}
      initial="hidden"
      animate="show"
      style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginTop: 16 }}
    >
      {cards.map((card, i) => (
        <motion.div
          key={i}
          variants={statFade}
          transition={{ duration: 0.32 }}
          className="card"
          style={{ padding: "20px 22px" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
            <span style={{ color: "var(--teal)" }}>{card.icon}</span>
            <span style={{ ...LABEL }}>{card.label}</span>
          </div>
          {card.big ? (
            <>
              <div style={{ ...MONO, fontSize: 26, color: card.bigColor, marginBottom: 8 }}>{card.big}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: card.footColor }}>{card.foot}</div>
            </>
          ) : (
            <>
              <p style={{ fontFamily: "var(--ui)", fontSize: 12.5, color: "var(--t1)", lineHeight: 1.6, marginBottom: 12 }}>
                {card.content}
              </p>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: card.footColor }}>{card.foot}</div>
            </>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── Page components ──────────────────────────────────────────────────────────
function TradingPage() {
  return (
    <div>
      <PageHeader
        title="AI Trading Desk"
        sub="RSI(14) + EMA(9/21) · Policy-enforced via TradingVault · Bybit v5 API"
        badge="AI Trading · Track 01"
        badgeColor="teal"
      />
      <LiveStats />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 308px", gap: 16, marginBottom: 16 }}>
        <TradingPanel />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <StrategyEngine />
          <ExecutionFeed />
        </div>
      </div>
      <AIInsights />
    </div>
  );
}

function IdentityPage() {
  return (
    <div>
      <PageHeader
        title="Agent Identity"
        sub="ERC-8004 soulbound NFT · reputation grows with every on-chain action"
        badge="ERC-8004"
        badgeColor="purple"
      />
      <motion.div
        variants={{ show: { transition: { staggerChildren: 0.09 } } }}
        initial="hidden"
        animate="show"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
      >
        {[<IdentityPanel key="id" />, <SkillsPanel key="sk" />].map((el, i) => (
          <motion.div
            key={i}
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.36 }}
          >
            {el}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

function AgentPage() {
  return (
    <div>
      <PageHeader
        title="Agent Terminal"
        sub="Live MCP agent · 12 tools · balances, market data, identity, on-chain actions"
        badge="MCP · 12 tools"
        badgeColor="teal"
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 308px", gap: 16 }}>
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.36 }}>
          <AgentChatPanel />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.36, delay: 0.06 }}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <GuardianControlPanel />
          <AuditTrailPanel />
        </motion.div>
      </div>
    </div>
  );
}

function DefiPage() {
  return (
    <div>
      <PageHeader
        title="DeFi & Yield"
        sub="Policy-enforced spending limits · mETH liquid staking 4.5% APY · Mantle LSP"
        badge="Mantle Ecosystem"
        badgeColor="teal"
      />
      <motion.div
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        initial="hidden"
        animate="show"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}
      >
        {[<SpendingLimitsPanel key="sl" />, <YieldPanel key="y" />, <TokenPolicyPanel key="tp" />].map((el, i) => (
          <motion.div
            key={i}
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.34 }}
          >
            {el}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Dashboard Root ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [page, setPage]   = useState<Page>("trading");
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [walletShort, setWalletShort] = useState("");

  useEffect(() => {
    const a = getContractAddresses();
    if (a?.walletAddress) {
      const addr = a.walletAddress;
      setWalletShort(`${addr.slice(0, 6)}…${addr.slice(-4)}`);
    }
  }, []);

  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  const PageComponent = { trading: TradingPage, identity: IdentityPage, agent: AgentPage, defi: DefiPage }[page];

  return (
    <div
      className={theme === "dark" ? "dark" : ""}
      style={{
        display: "grid",
        gridTemplateColumns: "234px 1fr",
        gridTemplateRows: "60px 1fr",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg)",
        position: "relative",
      }}
    >
      <Topbar active={page} onNav={setPage} theme={theme} toggleTheme={toggleTheme} />
      <Sidebar active={page} onNav={setPage} walletShort={walletShort} />

      <main
        style={{
          overflow: "auto",
          padding: "24px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 0,
          position: "relative",
          zIndex: 1,
        }}
      >
        <ConfigSection />
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.22, 0.68, 0, 1.15] }}
          >
            <PageComponent />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

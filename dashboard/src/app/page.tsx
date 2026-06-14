"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { AnimatePresence, motion } from "framer-motion";

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

// ─── Motion variants ─────────────────────────────────────────────────────────────

const slideInLeft  = { hidden: { x: -28, opacity: 0 }, show: { x: 0, opacity: 1 } };
const slideInDown  = { hidden: { y: -20, opacity: 0 }, show: { y: 0, opacity: 1 } };
const fadeUpBlur   = {
  hidden: { y: 18, opacity: 0, scale: 0.97, filter: "blur(6px)" },
  show:   { y: 0,  opacity: 1, scale: 1,    filter: "blur(0px)" },
};
const staggerParent = {
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.12 } },
};
const itemFade = {
  hidden: { opacity: 0, x: -10 },
  show:   { opacity: 1, x: 0 },
};
const statFade = {
  hidden: { opacity: 0, y: 10, filter: "blur(4px)" },
  show:   { opacity: 1, y: 0,  filter: "blur(0px)" },
};

// ─── Nav data ────────────────────────────────────────────────────────────────────

const SB_MAIN = [
  { id: "trading",  icon: "◎", label: "Trading",       badge: "LIVE" },
  { id: "identity", icon: "⬡", label: "Identity",      badge: null   },
  { id: "defi",     icon: "⬟", label: "DeFi & Yield",  badge: null   },
  { id: "agent",    icon: "⊕", label: "Agent Terminal", badge: null   },
] as const;

const SB_SYS: { icon: string; label: string; target: Page }[] = [
  { icon: "◻", label: "Guardian",    target: "agent"    },
  { icon: "⊞", label: "Skills",      target: "identity" },
  { icon: "◷", label: "Audit Trail", target: "agent"    },
];

// ─── Sidebar ────────────────────────────────────────────────────────────────────

function Sidebar({
  active,
  onNav,
  walletShort,
}: {
  active: Page;
  onNav: (p: Page) => void;
  walletShort: string;
}) {
  return (
    <motion.aside
      variants={slideInLeft}
      initial="hidden"
      animate="show"
      transition={{ duration: 0.48, ease: [0.22, 0.68, 0, 1.15] }}
      style={{
        background: "var(--s1)",
        borderRight: "1px solid var(--b1)",
        backdropFilter: "var(--blur)",
        WebkitBackdropFilter: "var(--blur)",
        padding: "20px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        overflowY: "auto",
      }}
    >
      {/* Section label */}
      <motion.div
        variants={staggerParent}
        initial="hidden"
        animate="show"
        style={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--t4)", letterSpacing: ".2em", textTransform: "uppercase", padding: "10px 10px 6px" }}>
          Main
        </div>

        {SB_MAIN.map((item) => {
          const isOn = active === item.id;
          return (
            <motion.button
              key={item.id}
              variants={itemFade}
              transition={{ duration: 0.3, ease: [0.22, 0.68, 0, 1.15] }}
              whileHover={{ x: 3, transition: { duration: 0.18 } }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onNav(item.id as Page)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "11px 14px",
                borderRadius: 12,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: isOn ? 600 : 500,
                color: isOn ? "var(--teal)" : "var(--t2)",
                background: isOn ? "var(--tg)" : "none",
                border: `1px solid ${isOn ? "var(--tb)" : "transparent"}`,
                transition: "background 0.22s, color 0.22s, border-color 0.22s",
                textAlign: "left",
                width: "100%",
                letterSpacing: "0.01em",
              }}
            >
              <span style={{ fontSize: 15, width: 18, textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <motion.span
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 8,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: "var(--td)",
                    border: "1px solid var(--tb)",
                    color: "var(--teal)",
                  }}
                >
                  {item.badge}
                </motion.span>
              )}
            </motion.button>
          );
        })}

        <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--t4)", letterSpacing: ".2em", textTransform: "uppercase", padding: "12px 10px 6px" }}>
          System
        </div>

        {SB_SYS.map((item) => (
          <motion.button
            key={item.label}
            variants={itemFade}
            transition={{ duration: 0.3, ease: [0.22, 0.68, 0, 1.15] }}
            whileHover={{ x: 3, transition: { duration: 0.18 } }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onNav(item.target)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "11px 14px",
              borderRadius: 12,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--t2)",
              background: "none",
              border: "1px solid transparent",
              transition: "background 0.22s, color 0.22s, border-color 0.22s",
              textAlign: "left",
              width: "100%",
            }}
          >
            <span style={{ fontSize: 15, width: 18, textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
            {item.label}
          </motion.button>
        ))}
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        style={{ marginTop: "auto", paddingTop: 14, borderTop: "1px solid var(--b1)" }}
      >
        <motion.div
          whileHover={{ borderColor: "var(--tb)" }}
          style={{
            background: "var(--s2)",
            border: "1px solid var(--b1)",
            borderRadius: 11,
            padding: "12px 14px",
            backdropFilter: "var(--blur2)",
            transition: "border-color 0.25s",
          }}
        >
          <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--t3)", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 6 }}>
            Agent Wallet
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--teal)" }}>
            {walletShort || "0x013b…d0deF"}
          </div>
        </motion.div>
      </motion.div>
    </motion.aside>
  );
}

// ─── Topbar ─────────────────────────────────────────────────────────────────────

function Topbar({
  active,
  onNav,
  theme,
  toggleTheme,
}: {
  active: Page;
  onNav: (p: Page) => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
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
      transition={{ duration: 0.42, ease: [0.22, 0.68, 0, 1.15] }}
      style={{
        gridColumn: "1 / -1",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background: "var(--s1)",
        borderBottom: "1px solid var(--b1)",
        backdropFilter: "var(--blur)",
        WebkitBackdropFilter: "var(--blur)",
        boxShadow: "var(--sh2)",
      }}
    >
      {/* Left: Logo + Nav pills */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4, ease: [0.22, 0.68, 0, 1.15] }}
          style={{ fontFamily: "var(--sans)", fontSize: 17, fontWeight: 800, letterSpacing: ".06em", color: "var(--t1)" }}
        >
          MANTLE<span style={{ color: "var(--teal)" }}>/</span>AGENT
        </motion.div>

        <nav
          style={{
            display: "flex",
            gap: 3,
            background: "var(--s2)",
            border: "1px solid var(--b1)",
            borderRadius: 24,
            padding: 4,
            backdropFilter: "var(--blur2)",
          }}
        >
          {pages.map((p, i) => {
            const isOn = active === p.id;
            return (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06, duration: 0.35, ease: [0.22, 0.68, 0, 1.15] }}
                whileHover={{ scale: isOn ? 1 : 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onNav(p.id)}
                style={{
                  fontSize: 14,
                  fontWeight: isOn ? 700 : 500,
                  padding: "7px 22px",
                  borderRadius: 20,
                  color: isOn ? "#000" : "var(--t2)",
                  background: isOn ? "var(--teal)" : "none",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.3s, color 0.3s, box-shadow 0.3s",
                  boxShadow: isOn ? "0 4px 20px rgba(0,229,160,0.35)" : "none",
                  letterSpacing: "0.02em",
                }}
              >
                {p.label}
              </motion.button>
            );
          })}
        </nav>
      </div>

      {/* Right chips */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.4, ease: [0.22, 0.68, 0, 1.15] }}
        style={{ display: "flex", alignItems: "center", gap: 10 }}
      >
        {/* Sepolia live */}
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            padding: "4px 12px",
            borderRadius: 7,
            border: "1px solid var(--tb)",
            color: "var(--teal)",
            background: "var(--td)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <div className="live-dot" />
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
                padding: "4px 12px",
                borderRadius: 7,
                border: "1px solid var(--b1)",
                color: "var(--t3)",
                background: "var(--s2)",
                cursor: "pointer",
                transition: "border-color 0.22s",
              }}
              title="Click to disconnect"
            >
              {short}
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ background: "var(--teal)", color: "#000" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => connect({ connector: injected() })}
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                padding: "4px 12px",
                borderRadius: 7,
                border: "1px solid var(--tb)",
                color: "var(--teal)",
                background: "var(--td)",
                cursor: "pointer",
                transition: "background 0.22s, color 0.22s",
              }}
            >
              Connect
            </motion.button>
          )
        )}

        {/* ERC-8004 badge */}
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            padding: "4px 12px",
            borderRadius: 7,
            border: "1px solid var(--pb)",
            color: "var(--purple)",
            background: "var(--pd)",
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
            width: 44,
            height: 24,
            borderRadius: 12,
            border: "1px solid var(--b2)",
            background: "var(--s2)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            padding: 4,
            transition: "background 0.3s",
          }}
        >
          <motion.div
            animate={{ x: theme === "light" ? 20 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "var(--teal)",
              boxShadow: "0 0 10px var(--teal)",
            }}
          />
        </motion.button>
      </motion.div>
    </motion.header>
  );
}

// ─── Live Stats Bar ──────────────────────────────────────────────────────────────

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

  const { mntBalance, isLoading: wLoad }                     = useWalletState(walletAddr);
  const { dailyRemaining, dailyLimit, isLoading: lLoad }     = useSpendingLimits(walletAddr, MANTLE_TOKENS.MNT);
  const { reputation, tokenId, isLoading: iLoad }            = useAgentIdentity(identityAddr, walletAddr);

  const remPct = dailyLimit > 0 ? `${((dailyRemaining / dailyLimit) * 100).toFixed(0)}% remaining` : "not set";
  const hasId  = mounted && tokenId > 0 && tokenId < 10_000_000;

  const stats = [
    { label: "MNT Balance",     value: wLoad ? null : mntBalance,                       unit: "MNT",      sub: mounted ? "● live on chain" : "—"            },
    { label: "Daily Remaining", value: lLoad ? null : dailyRemaining.toFixed(2),         unit: "MNT",      sub: remPct                                       },
    { label: "Open Positions",  value: "3",                                               unit: "",         sub: "+1 opened today"                            },
    { label: "Reputation",      value: iLoad ? null : hasId ? String(reputation) : "—",  unit: hasId ? "pts" : "", sub: hasId ? `ERC-8004 #${tokenId}` : "no identity" },
  ];

  return (
    <motion.div
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
      initial="hidden"
      animate="show"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 1,
        background: "var(--b1)",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid var(--b1)",
        marginBottom: 18,
      }}
    >
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          variants={statFade}
          transition={{ duration: 0.4, ease: [0.22, 0.68, 0, 1.15], delay: i * 0.06 }}
          style={{ background: "var(--s1)", padding: "16px 20px", backdropFilter: "var(--blur2)" }}
        >
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--t3)", letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 10 }}>
            {s.label}
          </div>
          {s.value === null ? (
            <div className="loading-shimmer" style={{ height: 28, width: 90, borderRadius: 6, marginBottom: 6 }} />
          ) : (
            <motion.div
              key={s.value}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 0.68, 0, 1.15] }}
              style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 5 }}
            >
              <span style={{ fontFamily: "var(--mono)", fontSize: 26, fontWeight: 400, color: "var(--t1)", letterSpacing: "-.03em", lineHeight: 1 }}>
                {s.value}
              </span>
              {s.unit && (
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--t3)" }}>{s.unit}</span>
              )}
            </motion.div>
          )}
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--t3)" }}>{s.sub}</div>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── Config Toggle ───────────────────────────────────────────────────────────────

function ConfigSection() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 10 }}>
      <motion.button
        whileHover={{ borderColor: "var(--b2)", color: "var(--t2)" }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen((o) => !o)}
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          padding: "5px 14px",
          borderRadius: 7,
          border: "1px solid var(--b1)",
          color: "var(--t3)",
          background: "var(--s1)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 7,
          transition: "border-color 0.22s, color 0.22s",
          marginBottom: open ? 10 : 0,
        }}
      >
        <span>⚙</span> Contract Config {open ? "▲" : "▼"}
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 0.68, 0, 1.15] }}
            style={{ overflow: "hidden" }}
          >
            <ContractConfigPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page header ─────────────────────────────────────────────────────────────────

function PageHeader({ title, sub, badge, badgeColor = "teal" }: {
  title: string;
  sub: string;
  badge?: string;
  badgeColor?: "teal" | "purple";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.22, 0.68, 0, 1.15] }}
      style={{ marginBottom: 18, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}
    >
      <div>
        <div style={{ fontFamily: "var(--sans)", fontSize: 30, fontWeight: 800, letterSpacing: "-.02em", color: "var(--t1)", lineHeight: 1.1 }}>
          {title}
        </div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--t3)", marginTop: 5 }}>
          {sub}
        </div>
      </div>
      {badge && (
        <span style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          padding: "4px 12px",
          borderRadius: 6,
          border: `1px solid ${badgeColor === "teal" ? "var(--tb)" : "var(--pb)"}`,
          color: badgeColor === "teal" ? "var(--teal)" : "var(--purple)",
          background: badgeColor === "teal" ? "var(--td)" : "var(--pd)",
          flexShrink: 0,
          marginTop: 4,
        }}>
          {badge}
        </span>
      )}
    </motion.div>
  );
}

// ─── Tab pages ───────────────────────────────────────────────────────────────────

function TradingPage() {
  return (
    <div>
      <PageHeader
        title="AI Trading Desk"
        sub="RSI(14) + EMA(9/21) · Risk-managed via TradingVault · Bybit v5 API"
        badge="Track 01 · AI Trading"
        badgeColor="teal"
      />
      <LiveStats />
      <TradingPanel />
    </div>
  );
}

function IdentityPage() {
  return (
    <div>
      <PageHeader
        title="On-chain Identity"
        sub="ERC-8004 soulbound agent NFT · reputation grows with every on-chain action"
        badge="ERC-8004"
        badgeColor="purple"
      />
      <motion.div
        variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        initial="hidden"
        animate="show"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
      >
        {[<IdentityPanel key="id" />, <SkillsPanel key="sk" />].map((el, i) => (
          <motion.div
            key={i}
            variants={{ hidden: { opacity: 0, y: 14, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1 } }}
            transition={{ duration: 0.42, ease: [0.22, 0.68, 0, 1.15] }}
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
        sub="Live MCP agent · 12 tools · query balances, market data, identity, trigger on-chain actions"
        badge="MCP · 12 tools"
        badgeColor="teal"
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
        <motion.div
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 0.68, 0, 1.15] }}
        >
          <AgentChatPanel />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.42, delay: 0.08, ease: [0.22, 0.68, 0, 1.15] }}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
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
        badge="Mantle ecosystem"
        badgeColor="teal"
      />
      <motion.div
        variants={{ show: { transition: { staggerChildren: 0.09 } } }}
        initial="hidden"
        animate="show"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}
      >
        {[<SpendingLimitsPanel key="sl" />, <YieldPanel key="y" />, <TokenPolicyPanel key="tp" />].map((el, i) => (
          <motion.div
            key={i}
            variants={{ hidden: { opacity: 0, y: 14, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1 } }}
            transition={{ duration: 0.4, ease: [0.22, 0.68, 0, 1.15] }}
          >
            {el}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Dashboard root ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [page, setPage]   = useState<Page>("trading");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [walletShort, setWalletShort] = useState("");

  useEffect(() => {
    const a = getContractAddresses();
    if (a?.walletAddress) {
      const addr = a.walletAddress;
      setWalletShort(`${addr.slice(0, 6)}…${addr.slice(-4)}`);
    }
  }, []);

  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  const PageComponent = {
    trading:  TradingPage,
    identity: IdentityPage,
    agent:    AgentPage,
    defi:     DefiPage,
  }[page];

  return (
    <div
      className={theme}
      style={{
        display: "grid",
        gridTemplateColumns: "230px 1fr",
        gridTemplateRows: "60px 1fr",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg)",
        position: "relative",
      }}
    >
      {/* Ambient orbs — animated */}
      <div
        className="orb-a"
        style={{
          position: "fixed",
          width: 900,
          height: 900,
          top: -320,
          left: -180,
          background: "radial-gradient(circle, rgba(0,229,160,0.07) 0%, transparent 65%)",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        className="orb-b"
        style={{
          position: "fixed",
          width: 700,
          height: 700,
          top: "20%",
          right: -140,
          background: "radial-gradient(circle, rgba(167,139,250,0.065) 0%, transparent 65%)",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "fixed",
          width: 500,
          height: 500,
          bottom: -100,
          left: "38%",
          background: "radial-gradient(circle, rgba(0,120,255,0.035) 0%, transparent 65%)",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 0,
          animation: "orbDriftB 28s ease-in-out infinite reverse",
        }}
      />

      {/* Topbar */}
      <Topbar active={page} onNav={setPage} theme={theme} toggleTheme={toggleTheme} />

      {/* Sidebar */}
      <Sidebar active={page} onNav={setPage} walletShort={walletShort} />

      {/* Content */}
      <main
        style={{
          overflow: "auto",
          padding: "22px 24px",
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
            variants={fadeUpBlur}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)", y: -8 }}
            transition={{ duration: 0.38, ease: [0.22, 0.68, 0, 1.15] }}
          >
            <PageComponent />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

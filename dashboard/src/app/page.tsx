"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
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

// ─── Sidebar ────────────────────────────────────────────────────────────────────

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
    <aside
      style={{
        background: "var(--s1)",
        borderRight: "1px solid var(--b1)",
        backdropFilter: "var(--blur)",
        WebkitBackdropFilter: "var(--blur)",
        padding: "18px 13px",
        display: "flex",
        flexDirection: "column",
        gap: 3,
        overflowY: "auto",
      }}
    >
      <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--t4)", letterSpacing: ".18em", textTransform: "uppercase", padding: "12px 10px 5px" }}>
        Main
      </div>

      {SB_MAIN.map((item) => {
        const isOn = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNav(item.id as Page)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 13px",
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 13.5,
              fontWeight: 500,
              color: isOn ? "var(--teal)" : "var(--t2)",
              background: isOn ? "var(--tg)" : "none",
              border: `1px solid ${isOn ? "var(--tb)" : "transparent"}`,
              transition: "all 0.25s var(--ease)",
              textAlign: "left",
              width: "100%",
            }}
            onMouseEnter={(e) => {
              if (!isOn) {
                (e.currentTarget as HTMLElement).style.background = "var(--s2)";
                (e.currentTarget as HTMLElement).style.color = "var(--t1)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--b1)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isOn) {
                (e.currentTarget as HTMLElement).style.background = "none";
                (e.currentTarget as HTMLElement).style.color = "var(--t2)";
                (e.currentTarget as HTMLElement).style.borderColor = "transparent";
              }
            }}
          >
            <span style={{ fontSize: 14, width: 16, textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge && (
              <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 7, padding: "2px 5px", borderRadius: 3, background: "var(--td)", border: "1px solid var(--tb)", color: "var(--teal)" }}>
                {item.badge}
              </span>
            )}
          </button>
        );
      })}

      <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--t4)", letterSpacing: ".18em", textTransform: "uppercase", padding: "12px 10px 5px" }}>
        System
      </div>

      {SB_SYS.map((item) => (
        <button
          key={item.label}
          onClick={() => onNav(item.target)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 13px",
            borderRadius: 10,
            cursor: "pointer",
            fontSize: 13.5,
            fontWeight: 500,
            color: "var(--t2)",
            background: "none",
            border: "1px solid transparent",
            transition: "all 0.25s var(--ease)",
            textAlign: "left",
            width: "100%",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--s2)";
            (e.currentTarget as HTMLElement).style.color = "var(--t1)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--b1)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "none";
            (e.currentTarget as HTMLElement).style.color = "var(--t2)";
            (e.currentTarget as HTMLElement).style.borderColor = "transparent";
          }}
        >
          <span style={{ fontSize: 14, width: 16, textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
          {item.label}
        </button>
      ))}

      {/* Footer */}
      <div style={{ marginTop: "auto", paddingTop: 13, borderTop: "1px solid var(--b1)" }}>
        <div
          style={{
            background: "var(--s2)",
            border: "1px solid var(--b1)",
            borderRadius: 9,
            padding: "11px 13px",
            backdropFilter: "var(--blur2)",
          }}
        >
          <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "var(--t3)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 5 }}>
            Agent Wallet
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--teal)" }}>
            {walletShort || "0x013b…d0deF"}
          </div>
        </div>
      </div>
    </aside>
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
    <header
      style={{
        gridColumn: "1 / -1",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 22px",
        background: "var(--s1)",
        borderBottom: "1px solid var(--b1)",
        backdropFilter: "var(--blur)",
        WebkitBackdropFilter: "var(--blur)",
        boxShadow: "var(--sh2)",
        transition: "var(--tr)",
      }}
    >
      {/* Left: Logo + Nav pills */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 15, fontWeight: 700, letterSpacing: ".05em", color: "var(--t1)" }}>
          MANTLE<span style={{ color: "var(--teal)" }}>/</span>AGENT
        </div>

        <nav
          style={{
            display: "flex",
            gap: 3,
            background: "var(--s2)",
            border: "1px solid var(--b1)",
            borderRadius: 22,
            padding: 4,
            backdropFilter: "var(--blur2)",
          }}
        >
          {pages.map((p) => {
            const isOn = active === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onNav(p.id)}
                style={{
                  fontSize: 13,
                  fontWeight: isOn ? 600 : 500,
                  padding: "6px 20px",
                  borderRadius: 18,
                  color: isOn ? "#000" : "var(--t2)",
                  background: isOn ? "var(--teal)" : "none",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.32s var(--ease)",
                  boxShadow: isOn ? "0 4px 16px rgba(0,229,160,0.28)" : "none",
                }}
              >
                {p.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right: chips + toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        {/* Sepolia live */}
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 9,
            padding: "3px 10px",
            borderRadius: 6,
            border: "1px solid var(--tb)",
            color: "var(--teal)",
            background: "var(--td)",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <div className="live-dot" />
          Sepolia · 5003
        </div>

        {/* Wallet */}
        {mounted && (
          isConnected && address ? (
            <button
              onClick={() => disconnect()}
              style={{
                fontFamily: "var(--mono)",
                fontSize: 9,
                padding: "3px 10px",
                borderRadius: 6,
                border: "1px solid var(--b1)",
                color: "var(--t3)",
                background: "var(--s2)",
                cursor: "pointer",
                transition: "var(--tr)",
              }}
              title="Click to disconnect"
            >
              {short}
            </button>
          ) : (
            <button
              onClick={() => connect({ connector: injected() })}
              style={{
                fontFamily: "var(--mono)",
                fontSize: 9,
                padding: "3px 10px",
                borderRadius: 6,
                border: "1px solid var(--tb)",
                color: "var(--teal)",
                background: "var(--td)",
                cursor: "pointer",
                transition: "var(--tr)",
              }}
            >
              Connect
            </button>
          )
        )}

        {/* ERC-8004 badge */}
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 9,
            padding: "3px 10px",
            borderRadius: 6,
            border: "1px solid var(--pb)",
            color: "var(--purple)",
            background: "var(--pd)",
          }}
        >
          ERC-8004
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          style={{
            width: 42,
            height: 22,
            borderRadius: 11,
            border: "1px solid var(--b2)",
            background: "var(--s2)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            padding: 4,
            transition: "var(--tr)",
          }}
        >
          <div
            style={{
              width: 13,
              height: 13,
              borderRadius: "50%",
              background: "var(--teal)",
              boxShadow: "0 0 8px var(--teal)",
              transform: theme === "light" ? "translateX(20px)" : "translateX(0)",
              transition: "transform 0.38s cubic-bezier(.22,.68,0,1.55)",
            }}
          />
        </button>
      </div>
    </header>
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

  const { mntBalance, isLoading: wLoad }             = useWalletState(walletAddr);
  const { dailyRemaining, dailyLimit, isLoading: lLoad } = useSpendingLimits(walletAddr, MANTLE_TOKENS.MNT);
  const { reputation, tokenId, name, isLoading: iLoad }   = useAgentIdentity(identityAddr, walletAddr);

  const remPct = dailyLimit > 0 ? `${((dailyRemaining / dailyLimit) * 100).toFixed(0)}% remaining` : "not set";
  const hasId  = mounted && tokenId > 0 && tokenId < 10_000_000;

  const stats = [
    { label: "MNT Balance",    value: wLoad ? null : mntBalance,                unit: "MNT",   sub: mounted ? "● connected" : "—" },
    { label: "Daily Remaining", value: lLoad ? null : dailyRemaining.toFixed(2), unit: "MNT",   sub: remPct },
    { label: "Active Positions", value: "3",                                      unit: "",       sub: "+1 opened today" },
    { label: "Reputation",      value: iLoad ? null : hasId ? String(reputation) : "—", unit: hasId ? "/ 1000" : "", sub: hasId ? `ERC-8004 #${tokenId}` : "no identity" },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 1,
        background: "var(--b1)",
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid var(--b1)",
        marginBottom: 16,
      }}
    >
      {stats.map((s) => (
        <div key={s.label} style={{ background: "var(--s1)", padding: "14px 18px", backdropFilter: "var(--blur2)" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--t3)", letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 9 }}>
            {s.label}
          </div>
          {s.value === null ? (
            <div className="loading-shimmer" style={{ height: 24, width: 80, borderRadius: 4, marginBottom: 4 }} />
          ) : (
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 400, color: "var(--t1)", letterSpacing: "-.02em", lineHeight: 1 }}>
                {s.value}
              </span>
              {s.unit && (
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--t3)" }}>{s.unit}</span>
              )}
            </div>
          )}
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--t3)" }}>{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Config Toggle ───────────────────────────────────────────────────────────────

function ConfigSection() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          fontFamily: "var(--mono)",
          fontSize: 9,
          padding: "4px 12px",
          borderRadius: 6,
          border: "1px solid var(--b1)",
          color: "var(--t3)",
          background: "var(--s1)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          transition: "var(--tr)",
          marginBottom: open ? 8 : 0,
        }}
      >
        <span>⚙</span> Contract Config {open ? "▲" : "▼"}
      </button>
      {open && <ContractConfigPanel />}
    </div>
  );
}

// ─── Tab pages ───────────────────────────────────────────────────────────────────

function TradingPage() {
  return (
    <div className="page-enter">
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em", color: "var(--t1)" }}>AI Trading Desk</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--t3)", marginTop: 3 }}>
          RSI(14) + EMA(9/21) · Risk-managed via TradingVault · Bybit v5 API
        </div>
      </div>
      <LiveStats />
      <TradingPanel />
    </div>
  );
}

function IdentityPage() {
  return (
    <div className="page-enter">
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em", color: "var(--t1)" }}>On-chain Identity</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--t3)", marginTop: 3 }}>
          ERC-8004 soulbound agent identity · 6 Byreal-compatible skill executors
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
        <IdentityPanel />
        <SkillsPanel />
      </div>
    </div>
  );
}

function AgentPage() {
  return (
    <div className="page-enter">
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em", color: "var(--t1)" }}>Agent Terminal</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--t3)", marginTop: 3 }}>
          Live MCP agent · 12 tools · query balances, market data, identity, trigger on-chain actions
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 13 }}>
        <AgentChatPanel />
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <GuardianControlPanel />
          <AuditTrailPanel />
        </div>
      </div>
    </div>
  );
}

function DefiPage() {
  return (
    <div className="page-enter">
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em", color: "var(--t1)" }}>DeFi &amp; Yield</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--t3)", marginTop: 3 }}>
          Policy-enforced spending limits · mETH liquid staking 4.5% APY · Mantle LSP
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 13 }}>
        <SpendingLimitsPanel />
        <YieldPanel />
        <TokenPolicyPanel />
      </div>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────────

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
        gridTemplateColumns: "220px 1fr",
        gridTemplateRows: "56px 1fr",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg)",
        position: "relative",
      }}
    >
      {/* Ambient orbs */}
      <div
        style={{
          position: "fixed",
          width: 800,
          height: 800,
          top: -300,
          left: -150,
          background: "radial-gradient(circle, rgba(0,229,160,0.065) 0%, transparent 65%)",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "fixed",
          width: 600,
          height: 600,
          top: "25%",
          right: -120,
          background: "radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 65%)",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 0,
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
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 13,
          position: "relative",
          zIndex: 1,
        }}
      >
        <ConfigSection />

        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 0.68, 0, 1.15] }}
          >
            <PageComponent />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

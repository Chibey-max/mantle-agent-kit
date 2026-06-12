"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { OverviewPanel }        from "@/components/panels/OverviewPanel";
import { SpendingLimitsPanel }  from "@/components/panels/SpendingLimitsPanel";
import { TokenPolicyPanel }     from "@/components/panels/TokenPolicyPanel";
import { TradingPanel }         from "@/components/panels/TradingPanel";
import { IdentityPanel }        from "@/components/panels/IdentityPanel";
import { SkillsPanel }          from "@/components/panels/SkillsPanel";
import { YieldPanel }           from "@/components/panels/YieldPanel";
import { AuditTrailPanel }      from "@/components/panels/AuditTrailPanel";
import { GuardianControlPanel } from "@/components/panels/GuardianControlPanel";
import { AgentChatPanel }       from "@/components/panels/AgentChatPanel";
import { ConnectWalletBanner }  from "@/components/shared/ConnectWalletBanner";
import { ContractConfigPanel }  from "@/components/shared/ContractConfigPanel";

import {
  useWalletState,
  useAgentIdentity,
  useSpendingLimits,
  MANTLE_TOKENS,
} from "@/hooks/useContractState";
import { getContractAddresses } from "@/lib/config";

// ─── Types ─────────────────────────────────────────────────────────────────────

type TabId = "overview" | "trading" | "defi" | "identity" | "agent";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview",  label: "Overview"     },
  { id: "trading",   label: "Trading"      },
  { id: "defi",      label: "DeFi & Yield" },
  { id: "identity",  label: "Identity"     },
  { id: "agent",     label: "Agent"        },
];

// ─── Stats Bar ─────────────────────────────────────────────────────────────────
// Rendered as a unified ruled table — not 4 separate floating cards.

function LiveStatsBar() {
  const [mounted, setMounted] = useState(false);
  const { address: connectedAddress } = useAccount();
  const [walletAddr,   setWalletAddr]   = useState<`0x${string}` | undefined>();
  const [identityAddr, setIdentityAddr] = useState<`0x${string}` | undefined>();

  useEffect(() => {
    setMounted(true);
    const a = getContractAddresses();
    if (a?.walletAddress?.startsWith("0x"))   setWalletAddr(a.walletAddress as `0x${string}`);
    if (a?.identityAddress?.startsWith("0x")) setIdentityAddr(a.identityAddress as `0x${string}`);
  }, []);

  const { mntBalance, isLoading: wLoading } = useWalletState(walletAddr ?? connectedAddress);
  const { dailyRemaining, dailyLimit, isLoading: lLoading } = useSpendingLimits(walletAddr, MANTLE_TOKENS.MNT);
  const { reputation, isLoading: iLoading } = useAgentIdentity(identityAddr, walletAddr);

  const remPct =
    dailyLimit > 0
      ? `${((dailyRemaining / dailyLimit) * 100).toFixed(0)}% remaining`
      : "not configured";

  const stats = [
    {
      label: "MNT Balance",
      value: wLoading  ? null : mntBalance,
      unit:  "MNT",
      sub:   mounted && connectedAddress ? "connected" : "connect wallet to see balance",
    },
    {
      label: "Daily Remaining",
      value: lLoading ? null : dailyRemaining.toFixed(2),
      unit:  "MNT",
      sub:   remPct,
    },
    {
      label: "Active Positions",
      value: "3",
      unit:  "",
      sub:   "+1 opened today",
    },
    {
      label: "Reputation",
      value: iLoading ? null : reputation > 0 ? String(reputation) : "—",
      unit:  reputation > 0 ? "/ 1000" : "",
      sub:   reputation > 0 ? "recorded on-chain" : "no identity configured",
    },
  ];

  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 rounded-xl overflow-hidden mb-8"
      style={{
        border: "1px solid var(--color-border)",
        background: "var(--color-border)",
        gap: "1px",
      }}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          className="px-5 py-4"
          style={{ background: "var(--color-surface)" }}
        >
          <div
            className="text-[10px] font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--color-text-muted)" }}
          >
            {s.label}
          </div>

          {!mounted || s.value === null ? (
            <div className="loading-shimmer rounded h-7 w-24 mb-1" />
          ) : (
            <div className="flex items-baseline gap-1.5 mb-1">
              <span
                className="text-[22px] font-mono font-semibold leading-none"
                style={{ color: "var(--color-text-primary)" }}
              >
                {s.value}
              </span>
              {s.unit && (
                <span
                  className="text-xs font-sans"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {s.unit}
                </span>
              )}
            </div>
          )}

          <div
            className="text-xs mt-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            {s.sub}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Agent Status Line ──────────────────────────────────────────────────────────

function AgentStatusLine() {
  const [mounted, setMounted] = useState(false);
  const [walletAddr,   setWalletAddr]   = useState<`0x${string}` | undefined>();
  const [identityAddr, setIdentityAddr] = useState<`0x${string}` | undefined>();

  useEffect(() => {
    setMounted(true);
    const a = getContractAddresses();
    if (a?.walletAddress?.startsWith("0x"))   setWalletAddr(a.walletAddress as `0x${string}`);
    if (a?.identityAddress?.startsWith("0x")) setIdentityAddr(a.identityAddress as `0x${string}`);
  }, []);

  const { tokenId, name, reputation } = useAgentIdentity(identityAddr, walletAddr);
  const hasToken = mounted && tokenId > 0 && tokenId < 10_000_000;
  const dispName = mounted && name?.trim() ? name : "Mantle AI Agent";
  const dispRep  = mounted && reputation > 0 ? reputation : null;

  return (
    <div
      className="flex items-center gap-2 text-xs font-mono mt-1.5"
      style={{ color: "var(--color-text-muted)" }}
    >
      <span className="live-dot" />
      <span style={{ color: "var(--color-green)" }}>Live on Mantle</span>

      {mounted && (
        <>
          <span style={{ opacity: 0.3 }}>·</span>
          <span>ERC-8004{hasToken ? ` #${tokenId}` : ""}</span>
          <span style={{ opacity: 0.3 }}>·</span>
          <span>{dispName}</span>
          {dispRep !== null && (
            <>
              <span style={{ opacity: 0.3 }}>·</span>
              <span>Rep {dispRep}</span>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Tab Navigation ─────────────────────────────────────────────────────────────

function TabNavigation({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <div className="tab-nav mb-8">
      {TABS.map(({ id, label }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="relative px-5 py-3 text-sm font-medium transition-colors duration-150 whitespace-nowrap outline-none flex-shrink-0"
            style={{ color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}
          >
            {label}
            {isActive && (
              <motion.div
                layoutId="tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ background: "var(--color-green)" }}
                transition={{ type: "spring", stiffness: 500, damping: 42 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Section Header ─────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  subtitle,
  badge,
  badgeColor = "green",
}: {
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: "green" | "blue" | "purple" | "amber";
}) {
  const colors = {
    green:  { bg: "rgba(0,212,170,0.06)",   border: "rgba(0,212,170,0.18)",  text: "var(--color-green)" },
    blue:   { bg: "rgba(96,165,250,0.06)",  border: "rgba(96,165,250,0.18)", text: "#93c5fd" },
    purple: { bg: "rgba(124,58,237,0.06)",  border: "rgba(124,58,237,0.18)", text: "#a78bfa" },
    amber:  { bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.18)", text: "#fbbf24" },
  }[badgeColor];

  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2
          className="text-[15px] font-semibold tracking-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          {title}
        </h2>
        <p
          className="text-xs mt-0.5"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {subtitle}
        </p>
      </div>
      {badge && (
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded flex-shrink-0"
          style={{
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            color: colors.text,
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

// ─── Tab Contents ────────────────────────────────────────────────────────────────

function OverviewTab() {
  return (
    <div>
      <SectionHeader
        title="Wallet overview"
        subtitle="Live balances, spending policy, and on-chain agent actions"
        badge="Live on Mantle"
      />
      <LiveStatsBar />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <OverviewPanel />
        <AuditTrailPanel />
      </div>
    </div>
  );
}

function TradingTabContent() {
  return (
    <div>
      <SectionHeader
        title="AI trading engine"
        subtitle="Bybit v5 market data · Kelly criterion position sizing · on-chain execution via TradingVault"
        badge="Bybit v5 API"
        badgeColor="blue"
      />
      <TradingPanel />
    </div>
  );
}

function DeFiTab() {
  return (
    <div>
      <SectionHeader
        title="DeFi & yield"
        subtitle="Policy-enforced spending limits, mETH liquid staking (4.5% APY), and token access policies"
        badge="Mantle ecosystem"
        badgeColor="purple"
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SpendingLimitsPanel />
        <YieldPanel />
        <TokenPolicyPanel />
      </div>
    </div>
  );
}

function IdentityTab() {
  return (
    <div>
      <SectionHeader
        title="On-chain identity & skills"
        subtitle="ERC-8004 soulbound agent identity with reputation scoring and 6 Byreal-compatible skill executors"
        badge="ERC-8004"
        badgeColor="amber"
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <IdentityPanel />
        <SkillsPanel />
      </div>
    </div>
  );
}

function AgentTab() {
  return (
    <div>
      <SectionHeader
        title="Agent terminal"
        subtitle="Live MCP agent with 12 tools — query balances, market data, identity, and trigger on-chain actions"
        badge="MCP · 12 tools"
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2"><AgentChatPanel /></div>
        <GuardianControlPanel />
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────────

const VALID_TABS = new Set<TabId>(["overview", "trading", "defi", "identity", "agent"]);

function DashboardInner() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const param = searchParams.get("tab") as TabId | null;
    return param && VALID_TABS.has(param) ? param : "overview";
  });

  // sync tab when URL changes (e.g. clicking navbar links)
  useEffect(() => {
    const param = searchParams.get("tab") as TabId | null;
    if (param && VALID_TABS.has(param)) setActiveTab(param);
  }, [searchParams]);

  return (
    <div className="min-h-screen px-6 pb-16 max-w-[1600px] mx-auto">

      <div className="pt-6">
        <ConnectWalletBanner />
      </div>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div className="pt-8 pb-7">
        <h1
          className="text-[26px] font-semibold tracking-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          Mantle Agent Kit
        </h1>
        <AgentStatusLine />
      </div>

      {/* ── Contract Config ────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <ContractConfigPanel />
      </div>

      {/* ── Tab Navigation ─────────────────────────────────────────────────────── */}
      <TabNavigation active={activeTab} onChange={setActiveTab} />

      {/* ── Tab Content ────────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14, ease: "easeOut" }}
        >
          {activeTab === "overview"  && <OverviewTab />}
          {activeTab === "trading"   && <TradingTabContent />}
          {activeTab === "defi"      && <DeFiTab />}
          {activeTab === "identity"  && <IdentityTab />}
          {activeTab === "agent"     && <AgentTab />}
        </motion.div>
      </AnimatePresence>

    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardInner />
    </Suspense>
  );
}

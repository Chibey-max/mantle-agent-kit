"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, ChevronDown, ChevronUp, CheckCircle, RefreshCw } from "lucide-react";
import { getContractAddresses, saveContractAddresses } from "@/lib/config";

// Real deployed addresses — used to auto-configure and as the "Use Deployed" shortcut
const ENV_WALLET   = process.env.NEXT_PUBLIC_AGENT_CONTRACT_ADDRESS    || "";
const ENV_IDENTITY = process.env.NEXT_PUBLIC_IDENTITY_CONTRACT_ADDRESS || "";
const ENV_VAULT    = process.env.NEXT_PUBLIC_TRADING_VAULT_ADDRESS     || "";

// Old placeholder values that may be in localStorage from before real deploy
const STALE_PLACEHOLDERS = new Set([
  "0x0000000000000000000000000000000000000001",
  "0x0000000000000000000000000000000000000002",
  "0x0000000000000000000000000000000000000003",
]);

export function ContractConfigPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [walletAddress,   setWalletAddress]   = useState(ENV_WALLET);
  const [identityAddress, setIdentityAddress] = useState(ENV_IDENTITY);
  const [vaultAddress,    setVaultAddress]    = useState(ENV_VAULT);

  useEffect(() => {
    const addrs = getContractAddresses();
    const wallet   = STALE_PLACEHOLDERS.has(addrs?.walletAddress ?? "")   ? ENV_WALLET   : (addrs?.walletAddress   || ENV_WALLET);
    const identity = STALE_PLACEHOLDERS.has(addrs?.identityAddress ?? "") ? ENV_IDENTITY : (addrs?.identityAddress || ENV_IDENTITY);
    const vault    = STALE_PLACEHOLDERS.has(addrs?.vaultAddress ?? "")    ? ENV_VAULT    : (addrs?.vaultAddress    || ENV_VAULT);

    setWalletAddress(wallet);
    setIdentityAddress(identity);
    setVaultAddress(vault);

    // Auto-save real addresses to localStorage so components pick them up
    if (wallet || identity || vault) {
      saveContractAddresses({ walletAddress: wallet, identityAddress: identity, vaultAddress: vault });
    }
  }, []);

  const hasConfig = walletAddress || identityAddress || vaultAddress;

  const handleSave = () => {
    saveContractAddresses({ walletAddress, identityAddress, vaultAddress });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleUseDeployed = () => {
    setWalletAddress(ENV_WALLET);
    setIdentityAddress(ENV_IDENTITY);
    setVaultAddress(ENV_VAULT);
  };

  const handleClear = () => {
    setWalletAddress("");
    setIdentityAddress("");
    setVaultAddress("");
    saveContractAddresses({ walletAddress: "", identityAddress: "", vaultAddress: "" });
  };

  return (
    <div
      className="mb-8 rounded-2xl overflow-hidden"
      style={{
        background: "rgba(8,8,20,0.5)",
        border: "1px solid rgba(255,255,255,0.065)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {/* Header toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/3 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-[var(--color-text-muted)]" />
          <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
            Contract Configuration
          </span>
          {!hasConfig ? (
            <span
              className="text-[10px] px-2 py-0.5 rounded font-mono"
              style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#f59e0b" }}
            >
              not configured
            </span>
          ) : (
            <span
              className="text-[10px] px-2 py-0.5 rounded font-mono flex items-center gap-1"
              style={{ background: "rgba(0,212,170,0.08)", border: "1px solid rgba(0,212,170,0.2)", color: "var(--color-green)" }}
            >
              <CheckCircle className="w-2.5 h-2.5" />
              Mantle Sepolia · configured
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-[var(--color-text-muted)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div
              className="px-5 pb-5 pt-1 space-y-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
            >
              <p className="text-xs text-[var(--color-text-muted)]">
                Contract addresses on Mantle Sepolia (Chain 5003). Pre-filled from deployment.
              </p>

              <div className="grid gap-3">
                {[
                  { label: "Agent Wallet Contract", value: walletAddress, setter: setWalletAddress },
                  { label: "Identity Contract (ERC-8004)", value: identityAddress, setter: setIdentityAddress },
                  { label: "Trading Vault", value: vaultAddress, setter: setVaultAddress },
                ].map(({ label, value, setter }) => (
                  <div key={label}>
                    <label className="block text-xs text-[var(--color-text-secondary)] mb-1">{label}</label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-3 py-2 rounded-xl text-xs font-mono text-white outline-none transition-all"
                      style={{
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.4)",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "rgba(0,212,170,0.4)";
                        e.currentTarget.style.boxShadow = "inset 0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,212,170,0.2)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                        e.currentTarget.style.boxShadow = "inset 0 1px 3px rgba(0,0,0,0.4)";
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: saved ? "rgba(0,212,170,0.2)" : "rgba(0,212,170,0.12)",
                    border: "1px solid rgba(0,212,170,0.3)",
                    color: "var(--color-green)",
                  }}
                >
                  {saved ? <><CheckCircle className="w-4 h-4" /> Saved</> : "Save Addresses"}
                </button>
                <button
                  onClick={handleUseDeployed}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  Use Deployed
                </button>
                <button
                  onClick={handleClear}
                  className="p-2 rounded-xl transition-all hover:bg-white/5"
                  style={{ color: "var(--color-text-muted)" }}
                  title="Clear all"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

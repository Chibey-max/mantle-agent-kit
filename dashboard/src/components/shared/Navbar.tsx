"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { Wallet, LogOut } from "lucide-react";
import clsx from "clsx";
import { useState, useEffect, Suspense } from "react";

// ─── Nav link definitions ───────────────────────────────────────────────────────
// href + optional tab value for links that deep-link into the dashboard tabs
const navLinks: { href: string; label: string; tab?: string }[] = [
  { href: "/",         label: "Dashboard"              },
  { href: "/trading",  label: "Trading"                },
  { href: "/",         label: "Identity", tab: "identity" },
  { href: "/",         label: "Agent",    tab: "agent"    },
];

// ─── NavLinks (needs useSearchParams — must be inside Suspense) ─────────────────

function NavLinksInner() {
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const currentTab  = searchParams.get("tab") ?? "";

  function isActive(link: typeof navLinks[number]) {
    if (link.tab) {
      // deep-link tab: active when on "/" with matching tab param
      return pathname === "/" && currentTab === link.tab;
    }
    if (link.href === "/") {
      // Dashboard: active on "/" when no tab or tab is overview
      return (
        pathname === "/" &&
        (currentTab === "" || currentTab === "overview")
      );
    }
    // Normal page link (e.g. /trading)
    return pathname === link.href;
  }

  return (
    <div
      className="flex items-center gap-0.5 px-1.5 py-1.5 rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {navLinks.map((link) => {
        const active = isActive(link);
        const href   = link.tab ? `/?tab=${link.tab}` : link.href;

        return (
          <Link
            key={`${link.href}-${link.label}`}
            href={href}
            className={clsx(
              "px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-150",
              active
                ? "text-white"
                : "text-[var(--color-text-secondary)] hover:text-white"
            )}
            style={
              active
                ? {
                    background: "rgba(255,255,255,0.09)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                  }
                : {}
            }
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}

// ─── Wallet Button ──────────────────────────────────────────────────────────────

function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, isPending }   = useConnect();
  const { disconnect }           = useDisconnect();
  const [mounted, setMounted]    = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  if (isConnected && address) {
    const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
    return (
      <div className="flex items-center gap-1">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--color-text-secondary)",
          }}
        >
          <span className="live-dot" />
          <span className="hidden sm:block">{short}</span>
        </div>
        <button
          onClick={() => disconnect()}
          className="p-1.5 rounded-full transition-colors hover:bg-white/10"
          style={{ color: "var(--color-text-muted)" }}
          title="Disconnect"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: injected() })}
      disabled={isPending}
      className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all"
      style={{
        background: "rgba(0, 212, 170, 0.12)",
        border: "1px solid rgba(0, 212, 170, 0.28)",
        color: isPending ? "var(--color-text-muted)" : "var(--color-green)",
      }}
    >
      <Wallet className="w-3 h-3" />
      {isPending ? "Connecting…" : "Connect wallet"}
    </button>
  );
}

// ─── Navbar ─────────────────────────────────────────────────────────────────────

export function Navbar() {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-14"
      style={{
        background: "rgba(8, 8, 18, 0.62)",
        backdropFilter: "blur(48px) saturate(180%)",
        WebkitBackdropFilter: "blur(48px) saturate(180%)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.05), " +
          "0 4px 24px rgba(0,0,0,0.18)",
      }}
    >
      <div className="max-w-[1600px] mx-auto px-6 h-full flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs"
            style={{ background: "var(--color-green)", color: "#07070f" }}
          >
            M
          </div>
          <span
            className="font-semibold text-sm hidden sm:block"
            style={{ color: "var(--color-text-primary)" }}
          >
            Mantle Agent
          </span>
        </Link>

        {/* Nav links — Suspense required for useSearchParams */}
        <div className="hidden md:flex items-center flex-1 justify-center">
          <Suspense
            fallback={
              <div
                className="flex items-center gap-0.5 px-1.5 py-1.5 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {navLinks.map((l) => (
                  <span
                    key={l.label}
                    className="px-4 py-1.5 rounded-xl text-sm font-medium"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {l.label}
                  </span>
                ))}
              </div>
            }
          >
            <NavLinksInner />
          </Suspense>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono"
            style={{
              background: "rgba(0, 212, 170, 0.06)",
              border: "1px solid rgba(0, 212, 170, 0.15)",
              color: "var(--color-green)",
            }}
          >
            <span className="live-dot" style={{ width: 5, height: 5 }} />
            <span>Mantle</span>
          </div>
          <WalletButton />
        </div>

      </div>
    </nav>
  );
}

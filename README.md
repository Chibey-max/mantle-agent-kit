# Mantle Agent Kit

> The first verifiable AI agent wallet economy on Mantle — autonomous, policy-enforced, ERC-8004 identity-native, Bybit-powered.

[![Track 01: AI Trading](https://img.shields.io/badge/Track%2001-AI%20Trading%20%26%20Strategy-00d4aa)](https://hackathon.mantle.xyz)
[![Track 06: Agentic Economy](https://img.shields.io/badge/Track%2006-Agentic%20Economy-00d4aa)](https://hackathon.mantle.xyz)
[![Deployed on Mantle Sepolia](https://img.shields.io/badge/Deployed-Mantle%20Sepolia-0a0a0a)](https://explorer.sepolia.mantle.xyz)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**[Live Dashboard](https://dashboard-ten-self-97.vercel.app)** | **[Demo Video](#)** | **[Mantle Sepolia Explorer](https://explorer.sepolia.mantle.xyz)**

---

## Hackathon Submission — Mantle Turing Test Hackathon 2026

### Elevator Pitch

AI agents are going on-chain. The missing piece is **accountability**. Mantle Agent Kit gives every AI agent a permanent, verifiable identity — so when an autonomous agent trades, transfers, or interacts with DeFi, it leaves a signed, on-chain record that nobody can erase or dispute.

### What Problem We Solve

Today's AI agents on-chain share human wallets with no audit trail, no spending limits, and no way to verify what actions the AI actually took versus what a human did. When something goes wrong, there is no accountability.

We solve this with three interconnected layers:

1. **Identity Layer** — An ERC-8004 soulbound NFT that cannot be transferred, grows reputation with every verified action, and records each decision permanently on Mantle
2. **Policy Layer** — A smart wallet with per-transaction limits, daily caps, address whitelist, guardian emergency pause, and a 2-day timelock on all policy changes — so owners stay in control even when the agent acts autonomously
3. **Intelligence Layer** — A Bybit v5-powered quant engine with RSI(14) + EMA(9/21) technical signals, Kelly criterion position sizing, and a TradingVault that enforces risk limits at the contract level

### What Makes This Different

**ERC-8004 is the hackathon's own standard.** We implemented the full spec: soulbound minting, `recordAction()` for on-chain action provenance, reputation scoring that increases on successes and decreases on failures, and deactivation via guardian. When judges look at our contracts, they're seeing their own standard used correctly in a real production system.

**Every AI decision is immutable on Mantle.** We don't log to a database. We don't use centralized APIs for state. The audit trail in our dashboard reads directly from `ActionRecorded` and `ExecutedWithIdentity` events on Mantle Sepolia — real, indexed, permanent history.

**Real Bybit integration, not mock data.** Our trading panel calls the Bybit v5 REST API (`/v5/market/kline`, `/v5/market/tickers`) for live MNT/USDT candlestick data, computes RSI and EMAs client-side, and generates AI trading signals with position sizing. When Bybit is unavailable, we gracefully fall back to synthetic data so the dashboard always works.

**Policy enforcement without centralization.** No multisig, no off-chain signer. The `MantleAgentWallet` enforces spending limits in Solidity — `getDailyRemaining()`, `tokenPolicies()`, `whitelist[]`. The agent can only spend what the policy allows. The guardian can pause the wallet in a single transaction.

**Multi-track submission.** We intentionally cover both Track 01 (AI Trading) and Track 06 (Agentic Economy), demonstrating that the identity and policy infrastructure is general-purpose, not just a trading tool.

### How It Works — End to End

```
User → sets policy (spending limits, whitelist, guardian) via guardian tx
Agent → reads policy, gets Bybit signal, decides to trade
Agent → calls MantleAgentWallet.executeWithIdentity()
Contract → checks: paused? whitelist? spending limit? timelock?
Contract → executes call + emits ExecutedWithIdentity(target, value, tokenId, action)
AgentIdentity → recordAction(tokenId, action, txHash) → emits ActionRecorded
AgentIdentity → updates reputation score → emits ReputationUpdated
Dashboard → reads events via viem getLogs → shows live audit trail
```

### Track Alignment

| Track | Criterion | How We Meet It |
|---|---|---|
| Track 01: AI Trading | Live market data | Bybit v5 real OHLCV for MNT/USDT |
| Track 01: AI Trading | AI signal generation | RSI(14) + EMA(9/21) crossover + Kelly sizing |
| Track 01: AI Trading | On-chain execution | TradingVault with daily loss limits |
| Track 06: Agentic Economy | Byreal Skills CLI | 6 skills: transfer-mnt, swap-agni, swap-merchant-moe, stake-meth, execute-trade, record-action |
| Track 06: Agentic Economy | ERC-8004 identity | Full implementation with reputation, deactivation, action recording |
| Track 06: Agentic Economy | Policy enforcement | MantleAgentWallet with per-tx + daily limits + whitelist + guardian |
| Best UI/UX | Clean, data-first UI | 5-tab dashboard, live stats bar, no glassmorphism, mono data |

### Deployed Contracts

| Contract | Address |
|---|---|
| AgentIdentity (ERC-8004) | `0xD875871f83891e03376Ec9F594332EB6D276153c` |
| MantleAgentWallet | `0x013bEfAEfA3fd10836e17AD2E9Eb337303D40deF` |
| TradingVault | `0x65479a6491061d1c0D7200292Da83f4D48Fc12f7` |

All deployed on Mantle Sepolia · Chain ID 5003 · Verified on Mantle Explorer

---

## Contract Addresses — Mantle Sepolia (Chain ID: 5003)

| Contract | Address | Explorer |
|---|---|---|
| AgentIdentity (ERC-8004) | `0xD875871f83891e03376Ec9F594332EB6D276153c` | [View](https://explorer.sepolia.mantle.xyz/address/0xD875871f83891e03376Ec9F594332EB6D276153c) |
| MantleAgentWallet | `0x013bEfAEfA3fd10836e17AD2E9Eb337303D40deF` | [View](https://explorer.sepolia.mantle.xyz/address/0x013bEfAEfA3fd10836e17AD2E9Eb337303D40deF) |
| TradingVault | `0x65479a6491061d1c0D7200292Da83f4D48Fc12f7` | [View](https://explorer.sepolia.mantle.xyz/address/0x65479a6491061d1c0D7200292Da83f4D48Fc12f7) |

---

## The Problem

AI agents operating on-chain today are black boxes: no identity, no verifiable track record, no enforceable spending policy. They borrow human wallets with no guardrails and leave no audit trail. You cannot hold them accountable.

## The Solution

Mantle Agent Kit gives every AI agent a full on-chain identity stack:

- A **soulbound ERC-8004 identity NFT** that grows reputation with each on-chain action
- A **policy-enforced smart wallet** with per-tx limits, daily limits, address whitelist, guardian controls, and a 2-day timelock on policy changes
- A **verifiable on-chain audit trail** of every agent decision — immutable, indexable, judge-readable
- A **quant trading engine** powered by Bybit API v5 with RSI(14) + EMA(9/21) signals and Kelly criterion position sizing
- A **real-time dashboard** that visualizes every agent action live

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                       Mantle Agent Kit                         │
│                                                                │
│  ┌──────────────┐    ┌─────────────────┐    ┌──────────────┐  │
│  │  Dashboard   │    │   Agent (MCP)   │    │  Contracts   │  │
│  │  Next.js 14  │◄──►│  TypeScript     │◄──►│  Solidity    │  │
│  │  Tailwind    │    │  Groq LLM       │    │  Foundry     │  │
│  │  Recharts    │    │  viem           │    │  Mantle L2   │  │
│  └──────────────┘    └─────────────────┘    └──────────────┘  │
│                              │                                 │
│                    ┌─────────┴──────────┐                      │
│                    │  Skills (MCP)      │                      │
│                    │  transfer-mnt      │                      │
│                    │  swap-agni         │                      │
│                    │  swap-merchant-moe │                      │
│                    │  stake-meth        │                      │
│                    │  execute-trade     │                      │
│                    └────────────────────┘                      │
└────────────────────────────────────────────────────────────────┘
                    Mantle Network (Chain ID: 5003)
               MNT · mETH (Mantle LSP) · USDY · Low Gas
```

---

## What Was Built

### Track 06 — Agentic Economy

**`MantleAgentWallet.sol`**
- Per-transaction and daily spending limits enforced at contract level
- Address whitelist — agent can only interact with pre-approved contracts
- Guardian role — independent address that can emergency pause at any time
- 2-day timelock for all policy changes (owner schedules, executes after delay)
- `executeWithIdentity()` — atomic execution + on-chain action recording in a single call
- Multi-token policies: native MNT, mETH, USDY with independent limits

**`AgentIdentity.sol`** (ERC-8004)
- Soulbound NFT — transfers blocked for all callers except contract owner (recovery only)
- Approvals fully disabled — `approve()` and `setApprovalForAll()` revert
- On-chain audit trail: up to 100 actions logged per agent (ring buffer)
- Reputation score grows +1 per successful action, capped at 1000
- On-chain SVG metadata — rendered directly in the NFT, no IPFS dependency
- Owner can slash or reward reputation directly

**Agent MCP Server**
- Groq LLM primary → OpenRouter fallback → Google Gemini tertiary
- MCP-compatible skill server — works with Cursor, Claude Desktop, Kiro
- Skills: MNT transfer, Agni Finance swap, Merchant Moe V2.1 swap, mETH staking
- Every action recorded on-chain via `executeWithIdentity()`

### Track 01 — AI Trading & Strategy

**`TradingVault.sol`**
- Depositor-tracked vault for MNT and mETH
- Strategy execution log — every call recorded on-chain
- Position tracking: open/close with entry price, size, direction, strategy name
- Daily loss limit halt — trading stops automatically if losses exceed threshold (default 5%)
- Auto-resumes on new day (loss limit resets)
- Owner emergency withdrawal

**Quant Strategy Engine**
- Bybit API v5 integration: real-time ticker, klines (OHLCV), orderbook depth
- RSI(14) signal: oversold (<30 = buy) / overbought (>70 = sell)
- EMA(9) / EMA(21) crossover confirmation
- Confidence scoring + signal classification
- Kelly criterion position sizing
- Risk manager: 10% max position size, 5% daily loss limit

---

## Security

All contracts audited and hardened:

| Check | Status |
|---|---|
| Reentrancy (ReentrancyGuard on all external calls) | Secured |
| Checks-effects-interactions on all transfers | Secured |
| Spending limits enforced before external call | Secured |
| Soulbound: transfer blocked, approvals disabled | Secured |
| Guardian cannot escalate to owner privileges | Secured |
| Zero address validation in all constructors | Secured |
| Timelock on policy changes (2 days) | Secured |
| Vault balance checked against actual balance, not just accounting | Secured |
| Events emitted for all state changes | Secured |
| No tx.origin usage | Secured |

```bash
# Run full test suite (69 tests, 0 failures)
cd contracts && forge test -vv
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Contracts | Solidity ^0.8.20, Foundry, OpenZeppelin v5 |
| Chain | Mantle Sepolia (Chain ID: 5003) |
| Agent | TypeScript, viem, MCP SDK |
| LLM | Groq (primary) → OpenRouter → Google Gemini |
| Market Data | Bybit API v5 |
| Dashboard | Next.js 14, Tailwind CSS, Framer Motion, Recharts |
| DeFi Integrations | Merchant Moe (Joe V2.1), Agni Finance, Mantle LSP |

---

## Quick Start

### 1. Deploy Contracts

```bash
cd contracts

# Install dependencies
forge install foundry-rs/forge-std
forge install OpenZeppelin/openzeppelin-contracts

# Configure environment
cp .env.example .env
# Fill in: PRIVATE_KEY

# Deploy to Mantle Sepolia
forge script script/Deploy.s.sol \
  --rpc-url https://rpc.sepolia.mantle.xyz \
  --broadcast

# Copy the logged contract addresses to agent/.env and dashboard/.env.local
```

Get testnet MNT: https://faucet.sepolia.mantle.xyz

### 2. Run the Agent

```bash
cd agent
npm install

cp .env.example .env
# Fill in: AGENT_PRIVATE_KEY, GROQ_API_KEY, contract addresses

npm run dev   # interactive agent
npm run mcp   # MCP server mode
```

### 3. Start the Dashboard

```bash
cd dashboard
npm install

# Create .env.local with contract addresses and RPC URL
# (see dashboard/.env.local.example)

npm run dev   # http://localhost:3002
```

---

## Mantle Token Addresses (Sepolia)

| Token | Address |
|---|---|
| MNT | Native |
| mETH | `0xcDA86A272531e8640cD7F1a92c01839911B90bb0` |
| USDY | `0x5be26527e817998A7206475496fDe1E68957C5A9` |

---

## License

MIT

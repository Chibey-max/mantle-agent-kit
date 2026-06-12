# Mantle Agent Kit

> The first verifiable AI agent wallet economy on Mantle — autonomous, policy-enforced, ERC-8004 identity-native, Bybit-powered.

[![Track 01: AI Trading](https://img.shields.io/badge/Track%2001-AI%20Trading%20%26%20Strategy-00d4aa)](https://hackathon.mantle.xyz)
[![Track 06: Agentic Economy](https://img.shields.io/badge/Track%2006-Agentic%20Economy-00d4aa)](https://hackathon.mantle.xyz)
[![Deployed on Mantle Sepolia](https://img.shields.io/badge/Deployed-Mantle%20Sepolia-0a0a0a)](https://explorer.sepolia.mantle.xyz)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**[Live Dashboard](https://dashboard-ten-self-97.vercel.app)** | **[Demo Video](#)** | **[Mantle Sepolia Explorer](https://explorer.sepolia.mantle.xyz)**

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

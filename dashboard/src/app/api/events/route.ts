import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, defineChain, formatEther, type AbiEvent } from "viem";

// Allow up to 60s execution on Vercel Pro / Hobby max
export const maxDuration = 60;

const mantleSepolia = defineChain({
  id: 5003,
  name: "Mantle Sepolia",
  nativeCurrency: { name: "MNT", symbol: "MNT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.sepolia.mantle.xyz"] },
    public:  { http: ["https://rpc.sepolia.mantle.xyz"] },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://explorer.sepolia.mantle.xyz" },
  },
});

const client = createPublicClient({
  chain: mantleSepolia,
  transport: http("https://rpc.sepolia.mantle.xyz", { timeout: 8_000 }),
});

// ── ABIs ──────────────────────────────────────────────────────────────────────

const WALLET_EVENTS = [
  { name: "Executed",           type: "event", inputs: [{ name: "target", type: "address", indexed: true }, { name: "value", type: "uint256", indexed: false }, { name: "data", type: "bytes", indexed: false }, { name: "returnData", type: "bytes", indexed: false }] },
  { name: "ExecutedWithIdentity", type: "event", inputs: [{ name: "target", type: "address", indexed: true }, { name: "value", type: "uint256", indexed: false }, { name: "tokenId", type: "uint256", indexed: false }, { name: "action", type: "string", indexed: false }] },
  { name: "TokenTransferred",   type: "event", inputs: [{ name: "token", type: "address", indexed: true }, { name: "to", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
  { name: "Deposited",          type: "event", inputs: [{ name: "token", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
  { name: "Paused",             type: "event", inputs: [{ name: "by", type: "address", indexed: true }] },
  { name: "Unpaused",           type: "event", inputs: [{ name: "by", type: "address", indexed: true }] },
  { name: "WhitelistUpdated",   type: "event", inputs: [{ name: "target", type: "address", indexed: true }, { name: "allowed", type: "bool", indexed: false }] },
  { name: "SpendingPolicySet",  type: "event", inputs: [{ name: "token", type: "address", indexed: true }, { name: "perTxLimit", type: "uint256", indexed: false }, { name: "dailyLimit", type: "uint256", indexed: false }] },
  { name: "TimelockScheduled",  type: "event", inputs: [{ name: "actionId", type: "bytes32", indexed: true }, { name: "executeAfter", type: "uint256", indexed: false }] },
] as const satisfies AbiEvent[];

const IDENTITY_EVENTS = [
  { name: "IdentityMinted",    type: "event", inputs: [{ name: "tokenId", type: "uint256", indexed: true }, { name: "agent", type: "address", indexed: true }, { name: "name", type: "string", indexed: false }, { name: "agentType", type: "string", indexed: false }] },
  { name: "ActionRecorded",    type: "event", inputs: [{ name: "tokenId", type: "uint256", indexed: true }, { name: "action", type: "string", indexed: false }, { name: "txHash", type: "bytes32", indexed: false }, { name: "timestamp", type: "uint256", indexed: false }] },
  { name: "ReputationUpdated", type: "event", inputs: [{ name: "tokenId", type: "uint256", indexed: true }, { name: "oldReputation", type: "uint256", indexed: false }, { name: "newReputation", type: "uint256", indexed: false }] },
] as const satisfies AbiEvent[];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuditEvent {
  id: string;
  blockNumber: bigint;
  txHash: string;
  timestamp: number;
  eventName: string;
  actionType: "transfer" | "trade" | "stake" | "identity" | "error" | "admin";
  description: string;
  success: boolean;
  gasUsed?: string;
  source: "wallet" | "identity";
}

// ── Cache ─────────────────────────────────────────────────────────────────────

let cache: { events: AuditEvent[]; ts: number } | null = null;
const CACHE_TTL = 30_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const ZERO = "0x0000000000000000000000000000000000000000";

function tokenLabel(addr: string) {
  const lc = addr.toLowerCase();
  if (lc === ZERO || lc === "0x000000000000000000000000000000000000800a") return "MNT";
  if (lc === "0xcda86a272531e8640cd7f1a92c01839911b90bb0") return "mETH";
  if (lc === "0x5be26527e817998a7206475496fde1e68957c5a9") return "USDY";
  return shortAddr(addr);
}

// Pre-chunk a range into CHUNK_SIZE-block slices, then fetch all in parallel
const CHUNK_SIZE = 5_000n;
type LogArgs = Record<string, unknown>;
type LogResult = { args: LogArgs; blockNumber: bigint; transactionHash: `0x${string}` };

async function fetchChunk(
  address: `0x${string}`,
  event: AbiEvent,
  fromBlock: bigint,
  toBlock: bigint
): Promise<LogResult[]> {
  try {
    const logs = await client.getLogs({ address, event, fromBlock, toBlock });
    return logs.map((l) => ({
      args: (l.args ?? {}) as LogArgs,
      blockNumber: l.blockNumber ?? 0n,
      transactionHash: l.transactionHash as `0x${string}`,
    }));
  } catch {
    return [];
  }
}

async function safeLogs(
  address: `0x${string}`,
  event: AbiEvent,
  fromBlock: bigint,
  toBlock: bigint
): Promise<LogResult[]> {
  const chunks: Array<[bigint, bigint]> = [];
  for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
    const end = start + CHUNK_SIZE - 1n < toBlock ? start + CHUNK_SIZE - 1n : toBlock;
    chunks.push([start, end]);
  }
  const results = await Promise.all(chunks.map(([s, e]) => fetchChunk(address, event, s, e)));
  return results.flat();
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const walletAddr  = (searchParams.get("wallet")   || process.env.NEXT_PUBLIC_AGENT_CONTRACT_ADDRESS || "") as `0x${string}`;
  const identityAddr = (searchParams.get("identity") || process.env.NEXT_PUBLIC_IDENTITY_CONTRACT_ADDRESS || "") as `0x${string}`;

  if (!walletAddr || !identityAddr) {
    return NextResponse.json({ error: "wallet and identity addresses required" }, { status: 400 });
  }
  // Reject placeholder / demo addresses immediately
  const isPlaceholder = (addr: string) => /^0x0{38,}[0-3]$/.test(addr);
  if (isPlaceholder(walletAddr) || isPlaceholder(identityAddr)) {
    return NextResponse.json({ events: [] });
  }

  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({ events: cache.events.map(e => ({ ...e, blockNumber: e.blockNumber.toString() })) });
  }

  try {
    const currentBlock = await client.getBlockNumber();

    // Search two windows: deploy window (historical) + recent window
    // Each window ≤ 9,999 blocks = single getLogs call, no chunking needed
    const DEPLOY_BLOCK = 39_869_495n;
    const DEPLOY_END   = DEPLOY_BLOCK + 9_999n;
    const RECENT_START = currentBlock > 9_999n ? currentBlock - 9_999n : 0n;

    // If deploy window and recent window overlap (chain is young), just use one range
    const windows: Array<[bigint, bigint]> =
      DEPLOY_END >= RECENT_START
        ? [[DEPLOY_BLOCK, currentBlock]]
        : [[DEPLOY_BLOCK, DEPLOY_END], [RECENT_START, currentBlock]];

    // For each event type, fetch all windows in parallel, then merge
    async function getAllLogs(address: `0x${string}`, event: AbiEvent) {
      const perWindow = await Promise.all(
        windows.map(([from, to]) => safeLogs(address, event, from, to))
      );
      return perWindow.flat();
    }

    const walletEventFetches  = WALLET_EVENTS.map((ev)   => getAllLogs(walletAddr,   ev as unknown as AbiEvent));
    const identityEventFetches = IDENTITY_EVENTS.map((ev) => getAllLogs(identityAddr, ev as unknown as AbiEvent));

    const [walletResults, identityResults] = await Promise.all([
      Promise.all(walletEventFetches),
      Promise.all(identityEventFetches),
    ]);

    const events: AuditEvent[] = [];
    let idx = 0;

    // ── Wallet events ──────────────────────────────────────────────────────────

    // Executed
    for (const log of walletResults[0]) {
      const target = log.args["target"] as string;
      const value = log.args["value"] as bigint;
      events.push({
        id: `w-exec-${idx++}`,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        timestamp: 0,
        eventName: "Executed",
        actionType: "transfer",
        description: `Executed call → ${shortAddr(target)}${value > 0n ? ` · ${formatEther(value)} MNT` : ""}`,
        success: true,
        source: "wallet",
      });
    }

    // ExecutedWithIdentity
    for (const log of walletResults[1]) {
      const target = log.args["target"] as string;
      const tokenId = log.args["tokenId"] as bigint;
      const action = log.args["action"] as string;
      events.push({
        id: `w-ewi-${idx++}`,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        timestamp: 0,
        eventName: "ExecutedWithIdentity",
        actionType: "identity",
        description: `[ERC-8004 #${tokenId}] ${action || `call → ${shortAddr(target)}`}`,
        success: true,
        source: "wallet",
      });
    }

    // TokenTransferred
    for (const log of walletResults[2]) {
      const token = log.args["token"] as string;
      const to = log.args["to"] as string;
      const amount = log.args["amount"] as bigint;
      const tok = tokenLabel(token);
      const formatted = parseFloat(formatEther(amount)).toFixed(4);
      events.push({
        id: `w-tt-${idx++}`,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        timestamp: 0,
        eventName: "TokenTransferred",
        actionType: "transfer",
        description: `Sent ${formatted} ${tok} → ${shortAddr(to)}`,
        success: true,
        source: "wallet",
      });
    }

    // Deposited
    for (const log of walletResults[3]) {
      const token = log.args["token"] as string;
      const amount = log.args["amount"] as bigint;
      const tok = tokenLabel(token);
      const formatted = parseFloat(formatEther(amount)).toFixed(4);
      events.push({
        id: `w-dep-${idx++}`,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        timestamp: 0,
        eventName: "Deposited",
        actionType: "transfer",
        description: `Deposited ${formatted} ${tok} into wallet`,
        success: true,
        source: "wallet",
      });
    }

    // Paused
    for (const log of walletResults[4]) {
      const by = log.args["by"] as string;
      events.push({
        id: `w-pause-${idx++}`,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        timestamp: 0,
        eventName: "Paused",
        actionType: "admin",
        description: `Wallet paused by ${shortAddr(by)}`,
        success: true,
        source: "wallet",
      });
    }

    // Unpaused
    for (const log of walletResults[5]) {
      const by = log.args["by"] as string;
      events.push({
        id: `w-unpause-${idx++}`,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        timestamp: 0,
        eventName: "Unpaused",
        actionType: "admin",
        description: `Wallet unpaused by ${shortAddr(by)}`,
        success: true,
        source: "wallet",
      });
    }

    // WhitelistUpdated
    for (const log of walletResults[6]) {
      const target = log.args["target"] as string;
      const allowed = log.args["allowed"] as boolean;
      events.push({
        id: `w-wl-${idx++}`,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        timestamp: 0,
        eventName: "WhitelistUpdated",
        actionType: "admin",
        description: `${allowed ? "Whitelisted" : "De-whitelisted"} ${shortAddr(target)}`,
        success: true,
        source: "wallet",
      });
    }

    // SpendingPolicySet
    for (const log of walletResults[7]) {
      const token = log.args["token"] as string;
      const perTx = log.args["perTxLimit"] as bigint;
      const daily = log.args["dailyLimit"] as bigint;
      const tok = tokenLabel(token);
      events.push({
        id: `w-sp-${idx++}`,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        timestamp: 0,
        eventName: "SpendingPolicySet",
        actionType: "admin",
        description: `Spending policy: ${tok} perTx=${parseFloat(formatEther(perTx)).toFixed(2)} daily=${parseFloat(formatEther(daily)).toFixed(2)}`,
        success: true,
        source: "wallet",
      });
    }

    // TimelockScheduled
    for (const log of walletResults[8]) {
      const executeAfter = log.args["executeAfter"] as bigint;
      const dt = new Date(Number(executeAfter) * 1000).toISOString().replace("T", " ").slice(0, 16);
      events.push({
        id: `w-tl-${idx++}`,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        timestamp: 0,
        eventName: "TimelockScheduled",
        actionType: "admin",
        description: `Timelock action scheduled · executes after ${dt}`,
        success: true,
        source: "wallet",
      });
    }

    // ── Identity events ────────────────────────────────────────────────────────

    // IdentityMinted
    for (const log of identityResults[0]) {
      const tokenId = log.args["tokenId"] as bigint;
      const agentAddr = log.args["agent"] as string;
      const name = log.args["name"] as string;
      events.push({
        id: `i-mint-${idx++}`,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        timestamp: 0,
        eventName: "IdentityMinted",
        actionType: "identity",
        description: `ERC-8004 identity #${tokenId} minted · "${name}" · ${shortAddr(agentAddr)}`,
        success: true,
        source: "identity",
      });
    }

    // ActionRecorded
    for (const log of identityResults[1]) {
      const tokenId = log.args["tokenId"] as bigint;
      const action = log.args["action"] as string;
      events.push({
        id: `i-act-${idx++}`,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        timestamp: 0,
        eventName: "ActionRecorded",
        actionType: "identity",
        description: `[ERC-8004 #${tokenId}] Action recorded: ${action}`,
        success: true,
        source: "identity",
      });
    }

    // ReputationUpdated
    for (const log of identityResults[2]) {
      const tokenId = log.args["tokenId"] as bigint;
      const oldRep = log.args["oldReputation"] as bigint;
      const newRep = log.args["newReputation"] as bigint;
      events.push({
        id: `i-rep-${idx++}`,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        timestamp: 0,
        eventName: "ReputationUpdated",
        actionType: "identity",
        description: `[ERC-8004 #${tokenId}] Reputation ${oldRep} → ${newRep}`,
        success: true,
        source: "identity",
      });
    }

    events.sort((a, b) => (a.blockNumber > b.blockNumber ? -1 : 1));

    // Approximate timestamps from block numbers (Mantle Sepolia ~2s block time)
    // Anchor: deploy block 39,869,495 ≈ Jun 2026
    const ANCHOR_BLOCK = 39_869_495n;
    const ANCHOR_TS = 1749168000; // approx Unix ts for deploy
    const BLOCK_TIME_S = 2;
    for (const ev of events) {
      const delta = Number(ev.blockNumber - ANCHOR_BLOCK) * BLOCK_TIME_S;
      ev.timestamp = ANCHOR_TS + delta;
    }

    cache = { events, ts: Date.now() };
    return NextResponse.json({ events: events.map(e => ({ ...e, blockNumber: e.blockNumber.toString() })) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "Failed to fetch events", detail: message }, { status: 500 });
  }
}

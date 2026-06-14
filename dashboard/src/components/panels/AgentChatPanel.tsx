"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Send, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { getContractAddresses } from "@/lib/config";

interface ToolCall {
  tool: string;
  result: unknown;
}

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date | null;
  toolCalls?: ToolCall[];
  isError?: boolean;
}

const QUICK_COMMANDS = [
  "Check my balance",
  "What are my spending limits?",
  "Show my identity",
  "MNT price",
  "How does the agent wallet work?",
];

const THINKING_MSGS = [
  "Analyzing wallet...",
  "Checking market conditions...",
  "Evaluating risk parameters...",
  "Querying on-chain data...",
  "Processing strategy...",
  "Fetching spending limits...",
  "Reading identity contract...",
];

function ToolCallBlock({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="mt-1 rounded-xl text-[10px] font-mono overflow-hidden"
      style={{
        background: "rgba(0,229,168,0.04)",
        border: "1px solid rgba(0,229,168,0.14)",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 transition-colors text-left"
        style={{ background: "transparent" }}
      >
        {expanded ? (
          <ChevronDown className="w-2.5 h-2.5 flex-shrink-0" style={{ color: "var(--teal-text)" }} />
        ) : (
          <ChevronRight className="w-2.5 h-2.5 flex-shrink-0" style={{ color: "var(--teal-text)" }} />
        )}
        <span style={{ color: "var(--teal-text)", fontWeight: 700 }}>⚡</span>
        <span style={{ color: "var(--teal-text)", fontWeight: 600 }}>Tool:</span>
        <span style={{ color: "var(--t2)", fontFamily: "var(--mono)" }}>{toolCall.tool}</span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-3 pb-2 overflow-auto max-h-40"
            style={{ color: "var(--t3)" }}
          >
            <pre className="text-[9px] whitespace-pre-wrap break-all">
              {JSON.stringify(toolCall.result, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const AgentAvatar = () => (
  <div
    style={{
      width: 28,
      height: 28,
      borderRadius: 10,
      background: "linear-gradient(135deg, #7c3aed, #00E5A8)",
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--sans)",
      fontSize: 11,
      fontWeight: 800,
      flexShrink: 0,
      boxShadow: "0 2px 8px rgba(124,58,237,0.28)",
    }}
  >
    M
  </div>
);

const UserAvatar = () => (
  <div
    style={{
      width: 28,
      height: 28,
      borderRadius: 10,
      background: "var(--s2)",
      border: "1px solid var(--b2)",
      color: "var(--t2)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--sans)",
      fontSize: 11,
      fontWeight: 700,
      flexShrink: 0,
    }}
  >
    U
  </div>
);

function MessageBubble({ message }: { message: Message }) {
  const isAgent = message.role === "agent";

  const renderContent = (text: string) =>
    text.split("\n").map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} style={{ lineHeight: 1.65, marginBottom: i < text.split("\n").length - 1 ? "0.3em" : 0 }}>
          {parts.map((p, j) =>
            j % 2 === 1 ? (
              <strong key={j} style={{ color: isAgent ? "var(--teal-text)" : "#7c3aed", fontWeight: 600 }}>
                {p}
              </strong>
            ) : (
              p
            )
          )}
        </p>
      );
    });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      style={{ display: "flex", gap: 10, flexDirection: isAgent ? "row" : "row-reverse" }}
    >
      {isAgent ? <AgentAvatar /> : <UserAvatar />}

      <div style={{ maxWidth: "80%", display: "flex", flexDirection: "column", gap: 4, alignItems: isAgent ? "flex-start" : "flex-end" }}>
        <div
          style={
            message.isError
              ? {
                  background: "rgba(239,68,68,0.07)",
                  border: "1px solid rgba(239,68,68,0.22)",
                  color: "#991B1B",
                  borderRadius: 16,
                  borderBottomLeftRadius: isAgent ? 5 : 16,
                  borderBottomRightRadius: isAgent ? 16 : 5,
                  padding: "12px 16px",
                }
              : isAgent
              ? {
                  background: "var(--card-bg)",
                  border: "1px solid var(--b1)",
                  color: "var(--t1)",
                  borderRadius: 16,
                  borderBottomLeftRadius: 5,
                  padding: "12px 16px",
                  boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
                }
              : {
                  background: "rgba(124,58,237,0.08)",
                  border: "1px solid rgba(124,58,237,0.18)",
                  color: "var(--t1)",
                  borderRadius: 16,
                  borderBottomRightRadius: 5,
                  padding: "12px 16px",
                }
          }
        >
          <div style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.01em" }}>
            {renderContent(message.content)}
          </div>
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
              {message.toolCalls.map((tc, i) => (
                <ToolCallBlock key={i} toolCall={tc} />
              ))}
            </div>
          )}
        </div>
        <div
          style={{ fontSize: 10, color: "var(--t3)", fontFamily: "var(--mono)", paddingLeft: 4, paddingRight: 4 }}
          suppressHydrationWarning
        >
          {message.timestamp?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) ?? ""}
        </div>
      </div>
    </motion.div>
  );
}

function ThinkingIndicator() {
  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setMsgIdx((i) => (i + 1) % THINKING_MSGS.length), 1600);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      style={{ display: "flex", gap: 10 }}
    >
      <AgentAvatar />
      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--b1)",
          borderRadius: 16,
          borderBottomLeftRadius: 5,
          padding: "12px 16px",
          boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--teal)" }}
              animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1, 0.8] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
            />
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.span
            key={msgIdx}
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.22 }}
            style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--teal-text)", fontWeight: 500 }}
          >
            {THINKING_MSGS[msgIdx]}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function AgentChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "agent",
      content:
        "Hey! I'm Mantle Agent — your on-chain assistant for this wallet. I can check your balances, spending limits, ERC-8004 identity, and live MNT market data. What would you like to know?",
      timestamp: null,
    },
  ]);

  useEffect(() => {
    setMessages((prev) =>
      prev.map((m) => (m.timestamp === null ? { ...m, timestamp: new Date() } : m))
    );
  }, []);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isTyping) return;

      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };
      setMessages((p) => [...p, userMsg]);
      setInput("");
      setIsTyping(true);

      try {
        const addrs = getContractAddresses();

        const history = messages
          .filter((m) => m.id !== "0")
          .map((m) => ({
            role: m.role === "agent" ? ("assistant" as const) : ("user" as const),
            content: m.content,
          }));

        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            history,
            contractAddress: addrs?.walletAddress || "",
            identityAddress: addrs?.identityAddress || "",
          }),
        });

        const data = await res.json();

        const agentMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "agent",
          content: data.error ? `Error: ${data.error}` : (data.response ?? "No response"),
          timestamp: new Date(),
          toolCalls: data.toolCalls || [],
          isError: !!data.error,
        };
        setMessages((p) => [...p, agentMsg]);
      } catch (err) {
        const agentMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "agent",
          content: `Network error: ${err instanceof Error ? err.message : "unknown"}`,
          timestamp: new Date(),
          isError: true,
        };
        setMessages((p) => [...p, agentMsg]);
      } finally {
        setIsTyping(false);
      }
    },
    [isTyping, messages]
  );

  const agentState = isTyping ? "THINKING" : "ONLINE";

  return (
    <div className="card overflow-hidden" style={{ borderColor: "var(--tb)" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: "1px solid var(--b1)",
          background: "linear-gradient(180deg, var(--card-bg), var(--card2-bg))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Terminal style={{ width: 14, height: 14, color: "var(--teal)" }} />
          <span style={{ fontFamily: "var(--sans)", fontWeight: 700, color: "var(--t1)", fontSize: 14 }}>
            Agent Terminal
          </span>
          <span className="status-badge live">
            <span className="live-dot" />
            {agentState}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {["ONLINE", "THINKING", "EXECUTING", "PAUSED"].map((state) => (
            <span
              key={state}
              className="glass-sm"
              style={{
                fontFamily: "var(--mono)",
                fontSize: 9,
                color: state === agentState ? "var(--teal-text)" : "var(--t3)",
                padding: "4px 8px",
                borderRadius: 999,
                borderColor: state === agentState ? "var(--tb)" : "rgba(255,255,255,0.5)",
              }}
            >
              {state}
            </span>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          height: 420,
          overflowY: "auto",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          background:
            "linear-gradient(var(--s1) 1px, transparent 1px), linear-gradient(90deg, var(--s1) 1px, transparent 1px), var(--bg2)",
          backgroundSize: "32px 32px",
        }}
      >
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        <AnimatePresence>
          {isTyping && <ThinkingIndicator />}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested actions */}
      <div
        style={{
          padding: "10px 16px 8px",
          display: "flex",
          gap: 6,
          overflowX: "auto",
          scrollbarWidth: "none",
          borderTop: "1px solid var(--b1)",
          background: "var(--card-bg)",
        }}
      >
        {QUICK_COMMANDS.map((cmd) => (
          <button
            key={cmd}
            onClick={() => sendMessage(cmd)}
            disabled={isTyping}
            style={{
              flexShrink: 0,
              fontFamily: "var(--ui)",
              fontSize: 11,
              fontWeight: 500,
              padding: "5px 12px",
              borderRadius: 20,
              border: "1px solid var(--tb)",
              background: "var(--td)",
              color: "var(--teal-text)",
              whiteSpace: "nowrap",
              cursor: "pointer",
              opacity: isTyping ? 0.5 : 1,
              transition: "border-color 0.15s, background 0.15s",
            }}
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Input */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          borderTop: "1px solid var(--b1)",
          background: "var(--card-bg)",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 14px",
            borderRadius: 14,
            background: "var(--card2-bg)",
            border: "1px solid var(--b2)",
            transition: "border-color 0.18s",
          }}
        >
          <span style={{ color: "var(--teal)", fontFamily: "var(--mono)", fontSize: 12, flexShrink: 0 }}>{">"}</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage(input);
            }}
            placeholder="Ask the agent anything..."
            style={{
              flex: 1,
              background: "transparent",
              outline: "none",
              border: "none",
              fontFamily: "var(--mono)",
              fontSize: 13,
              color: "var(--t1)",
            }}
          />
        </div>
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isTyping}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: input.trim() && !isTyping ? "var(--teal)" : "var(--s2)",
            color: input.trim() && !isTyping ? "#000" : "var(--t3)",
            cursor: input.trim() && !isTyping ? "pointer" : "not-allowed",
            transition: "background 0.18s, color 0.18s",
            boxShadow: input.trim() && !isTyping ? "0 8px 20px rgba(0,229,168,0.24)" : "none",
          }}
        >
          {isTyping ? (
            <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} />
          ) : (
            <Send style={{ width: 15, height: 15 }} />
          )}
        </motion.button>
      </div>
    </div>
  );
}

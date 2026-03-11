import { useState, useEffect, useRef, useMemo } from "react";
import { api, type ChatMessage } from "../lib/api.js";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit" });
}

/** Lightweight Markdown-to-JSX renderer for chat messages */
function MarkdownContent({ text }: { text: string }) {
  const elements = useMemo(() => parseMarkdown(text), [text]);
  return <>{elements}</>;
}

function parseMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code blocks
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      result.push(
        <pre
          key={key++}
          className="bg-zinc-950 border border-red-500/10 rounded-sm px-3 py-2 my-1.5 overflow-x-auto"
        >
          {lang && (
            <span className="text-[8px] text-zinc-700 font-mono tracking-wider block mb-1">
              {lang.toUpperCase()}
            </span>
          )}
          <code className="text-[11px] text-zinc-400 font-mono leading-relaxed">
            {codeLines.join("\n")}
          </code>
        </pre>,
      );
      continue;
    }

    // Empty line → spacer
    if (line.trim() === "") {
      result.push(<div key={key++} className="h-1.5" />);
      i++;
      continue;
    }

    // Unordered list items
    if (/^[\-\*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\-\*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[\-\*]\s/, ""));
        i++;
      }
      result.push(
        <ul key={key++} className="list-none space-y-0.5 my-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-1.5 text-[12px] text-zinc-400 leading-relaxed">
              <span className="text-red-500/30 shrink-0">—</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Ordered list items
    if (/^\d+[\.\)]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[\.\)]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+[\.\)]\s/, ""));
        i++;
      }
      result.push(
        <ol key={key++} className="list-none space-y-0.5 my-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-1.5 text-[12px] text-zinc-400 leading-relaxed">
              <span className="text-zinc-700 shrink-0 tabular-nums w-3 text-right">{idx + 1}.</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // Normal paragraph
    result.push(
      <p key={key++} className="text-[12px] text-zinc-400 leading-relaxed">
        {renderInline(line)}
      </p>,
    );
    i++;
  }

  return result;
}

/** Render inline markdown: `code`, **bold**, *italic* */
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Match: `code`, **bold**, *italic* — in order of precedence
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("`")) {
      parts.push(
        <code
          key={match.index}
          className="bg-zinc-900 text-red-400/80 px-1 py-0.5 rounded-sm text-[11px]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      parts.push(
        <strong key={match.index} className="text-zinc-300 font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*")) {
      parts.push(
        <em key={match.index} className="text-zinc-400 italic">
          {token.slice(1, -1)}
        </em>,
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getChat()
      .then((data) => setMessages(data.messages))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);

    const userMsg: ChatMessage = { role: "user", content: text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const { reply } = await api.sendChat(text);
      const assistantMsg: ChatMessage = { role: "assistant", content: reply, timestamp: Date.now() };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errMsg: ChatMessage = {
        role: "assistant",
        content: `[ERROR] ${err instanceof Error ? err.message : "Failed to respond"}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  async function handleClear() {
    await api.clearChat();
    setMessages([]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-3 bg-red-500/20 rounded-[1px]" />
        <h2 className="text-[9px] font-mono font-bold text-zinc-600 tracking-[0.2em]">
          COMMS CHANNEL
        </h2>
        <div className="flex-1 h-px bg-red-500/5" />
        {messages.length > 0 && (
          <button
            onClick={() => void handleClear()}
            className="text-[9px] font-mono text-zinc-800 hover:text-zinc-500 tracking-wider transition-colors"
          >
            PURGE
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto panel mb-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 border border-red-500/10 rounded-sm flex items-center justify-center mx-auto mb-3">
                <div className="w-2 h-2 bg-red-500/20 rounded-full" />
              </div>
              <p className="text-zinc-700 text-[10px] font-mono tracking-wider">CHANNEL OPEN</p>
              <p className="text-zinc-800 text-[10px] mt-1 font-mono">Direct line to your agent</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-2.5">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-sm px-3 py-2 ${
                    msg.role === "user"
                      ? "bg-red-500/8 border border-red-500/10"
                      : "bg-zinc-900/60 border border-zinc-800/40"
                  }`}
                >
                  {/* Role tag */}
                  <p className={`text-[8px] font-mono font-bold tracking-[0.2em] mb-1 ${
                    msg.role === "user" ? "text-red-500/40" : "text-zinc-700"
                  }`}>
                    {msg.role === "user" ? "OPERATOR" : "AGENT"}
                  </p>
                  <div className="font-mono">
                    <MarkdownContent text={msg.content} />
                  </div>
                  <p className={`text-[9px] mt-1.5 font-mono tabular-nums ${
                    msg.role === "user" ? "text-red-500/20" : "text-zinc-800"
                  }`}>
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-zinc-900/60 border border-zinc-800/40 rounded-sm px-3 py-2">
                  <p className="text-[8px] font-mono font-bold tracking-[0.2em] mb-1 text-zinc-700">AGENT</p>
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-red-500/40 animate-pulse" />
                    <div className="w-1 h-1 rounded-full bg-red-500/40 animate-pulse [animation-delay:200ms]" />
                    <div className="w-1 h-1 rounded-full bg-red-500/40 animate-pulse [animation-delay:400ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="> message..."
          disabled={sending}
          className="flex-1 bg-zinc-950 border border-red-500/10 rounded-sm px-4 py-2.5 text-[12px] text-zinc-300 placeholder-zinc-800 focus:outline-none focus:border-red-500/25 transition-colors disabled:opacity-40 font-mono"
        />
        <button
          onClick={() => void send()}
          disabled={sending || !input.trim()}
          className="px-5 py-2.5 rounded-sm text-[10px] font-mono font-bold tracking-[0.15em] transition-all duration-100 disabled:opacity-20 text-red-500 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10"
        >
          SEND
        </button>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { api, type StatusData, type ActivityEvent, type StatsData, type KnowledgeEntry, type FeedbackEntry, type WalletInfo, type ConfigData, type AgentCashBalance } from "../lib/api.js";

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour12: false });
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const EVENT_COLORS: Record<string, string> = {
  poll: "text-zinc-700",
  loop_start: "text-sky-500",
  loop_complete: "text-green-500",
  tool_call: "text-amber-500",
  feedback: "text-violet-400",
  error: "text-red-500",
  ws: "text-zinc-700",
  study: "text-red-300",
};

const EVENT_LABELS: Record<string, string> = {
  poll: "SYNC",
  loop_start: "EXEC",
  loop_complete: "DONE",
  tool_call: "TOOL",
  feedback: "RATE",
  error: "ERR",
  ws: "LINK",
  study: "LEARN",
};

const FILTER_OPTIONS: { label: string; type: string | null }[] = [
  { label: "ALL", type: null },
  { label: "EXEC", type: "loop_start" },
  { label: "TOOL", type: "tool_call" },
  { label: "RATE", type: "feedback" },
  { label: "ERR", type: "error" },
  { label: "LEARN", type: "study" },
  { label: "SYNC", type: "poll" },
];

const TOPIC_COLORS: Record<string, string> = {
  analysis: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  research: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  simulate: "text-amber-400 bg-amber-500/10 border-amber-500/20",
};

type IntelTab = "knowledge" | "feedback";

export function Dashboard() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [agentCashBalance, setAgentCashBalance] = useState<AgentCashBalance | null>(null);
  const [agentCashEnabled, setAgentCashEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventFilter, setEventFilter] = useState<string | null>(null);
  const [intelTab, setIntelTab] = useState<IntelTab>("knowledge");

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const [s, t, st, w, k, f, cfg] = await Promise.all([
          api.getStatus(),
          api.getTasks(),
          api.getStats(),
          api.getWallet().catch(() => null),
          api.getKnowledge().catch(() => ({ entries: [] })),
          api.getFeedback().catch(() => ({ entries: [] })),
          api.getConfig().catch(() => null),
        ]);
        if (!active) return;
        setStatus(s);
        setEvents(t.events.reverse());
        setStats(st);
        setWallet(w);
        setKnowledge(k.entries);
        setFeedback(f.entries);
        setError(null);

        const cashEnabled = cfg?.agentCashEnabled ?? false;
        setAgentCashEnabled(cashEnabled);
        if (cashEnabled) {
          api.getAgentCashBalance()
            .then((b) => { if (active) setAgentCashBalance(b); })
            .catch(() => { if (active) setAgentCashBalance(null); });
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Connection failed");
      }
    }

    void poll();
    const interval = setInterval(() => void poll(), 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  async function toggleAgent() {
    if (!status) return;
    if (status.running) {
      await api.stop();
    } else {
      await api.start();
    }
  }

  if (error) {
    return (
      <div className="text-center py-24">
        <div className="w-16 h-16 border border-red-500/10 rounded-sm flex items-center justify-center mx-auto mb-4">
          <div className="w-4 h-4 border border-zinc-800 rounded-sm" />
        </div>
        <p className="text-red-500/60 text-xs font-mono tracking-wider mb-1">SIGNAL LOST</p>
        <p className="text-zinc-700 text-[10px] font-mono">{error}</p>
        <p className="text-zinc-800 text-[10px] mt-6 font-mono tracking-wider">RUN: cashclaw start</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="text-center py-24">
        <div className="w-6 h-6 border border-red-900/40 rounded-sm animate-spin mx-auto mb-4" />
        <p className="text-red-500/40 text-[10px] font-mono tracking-[0.3em]">CONNECTING</p>
      </div>
    );
  }

  const isStudying = events.length > 0
    && events[0]?.type === "study"
    && events[0]?.message.startsWith("Starting");

  const agentState = isStudying ? "studying" : status.running ? "active" : "idle";

  const filteredEvents = eventFilter
    ? events.filter((ev) => ev.type === eventFilter)
    : events;

  const balanceDisplay = wallet?.balance
    ? `${parseFloat(wallet.balance).toFixed(4)}`
    : "--";

  const recentKnowledge = knowledge.slice(-5).reverse();
  const recentFeedback = feedback.slice(-5).reverse();

  return (
    <div className="space-y-4">
      {/* Primary status panel */}
      <div className="panel px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Status indicator */}
          <div className="flex items-center gap-2.5">
            <div className={`w-2 h-2 rounded-full ${
              agentState === "studying"
                ? "bg-red-300 glow-red animate-pulse"
                : agentState === "active"
                  ? "bg-red-500 glow-red"
                  : "bg-zinc-800 border border-zinc-700"
            }`} />
            <span className={`text-[11px] font-mono font-bold tracking-[0.15em] ${
              agentState === "studying"
                ? "text-red-300"
                : agentState === "active"
                  ? "text-red-400"
                  : "text-zinc-700"
            }`}>
              {agentState === "studying" ? "LEARNING" : agentState === "active" ? "ACTIVE" : "STANDBY"}
            </span>
          </div>

          {/* Uptime readout */}
          {status.running && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-zinc-700 font-mono">UP</span>
              <span className="text-[11px] text-zinc-500 font-mono readout">{formatUptime(status.uptime)}</span>
            </div>
          )}

          {/* Agent ID */}
          <span className="text-[10px] text-zinc-800 font-mono hidden sm:inline">{status.agentId}</span>
        </div>

        <button
          onClick={() => void toggleAgent()}
          className={`px-4 py-1.5 rounded-sm text-[10px] font-mono font-bold tracking-[0.15em] transition-all duration-100 border ${
            status.running
              ? "text-zinc-600 border-zinc-800 hover:border-zinc-700 hover:text-zinc-500"
              : "text-red-500 border-red-500/30 bg-red-500/5 hover:bg-red-500/10"
          }`}
        >
          {status.running ? "HALT" : "ENGAGE"}
        </button>
      </div>

      {/* Readout grid */}
      <div className={`grid grid-cols-3 gap-1.5 ${agentCashEnabled ? "md:grid-cols-10" : "md:grid-cols-9"}`}>
        <Readout label="OPS" value={String(status.activeTasks)} lit={status.activeTasks > 0} />
        <Readout label="TIME" value={status.running ? formatUptime(status.uptime) : "--:--"} />
        <Readout label="SYNC" value={status.lastPoll ? formatTime(status.lastPoll) : "--:--:--"} />
        <Readout label="STUDY" value={stats && stats.studySessions > 0 ? String(stats.studySessions) : "0"} lit={Boolean(stats && stats.studySessions > 0)} />
        <Readout label="DONE" value={stats ? String(stats.totalTasks) : "0"} />
        <Readout label="SCORE" value={stats && stats.avgScore > 0 ? stats.avgScore.toFixed(1) : "--"} />
        <Readout label="RATE" value={stats && stats.totalTasks > 0 ? `${stats.completionRate}%` : "--"} />
        <Readout label="KNOW" value={stats ? String(stats.knowledgeEntries) : "0"} />
        <Readout label="BAL" value={balanceDisplay} lit={balanceDisplay !== "--"} />
        {agentCashEnabled && (
          <Readout
            label="USDC"
            value={agentCashBalance ? parseFloat(agentCashBalance.balance).toFixed(2) : "--"}
            lit={agentCashBalance !== null && parseFloat(agentCashBalance.balance) > 0}
          />
        )}
      </div>

      {/* Two-column: Event Log + Intelligence Briefing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Event log */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-3 bg-red-500/20 rounded-[1px]" />
            <h2 className="text-[9px] font-mono font-bold text-zinc-600 tracking-[0.2em]">
              EVENT LOG
            </h2>
            <div className="flex-1 h-px bg-red-500/5" />
            <span className="text-[9px] font-mono text-zinc-800">{filteredEvents.length}</span>
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap gap-1 mb-2">
            {FILTER_OPTIONS.map((f) => (
              <button
                key={f.label}
                onClick={() => setEventFilter(eventFilter === f.type ? null : f.type)}
                className={`px-2 py-0.5 rounded-sm text-[8px] font-mono font-bold tracking-wider transition-all border ${
                  eventFilter === f.type
                    ? "text-red-400 border-red-500/25 bg-red-500/10"
                    : "text-zinc-700 border-zinc-800/50 hover:border-zinc-700 hover:text-zinc-500"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="panel max-h-[28rem] overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <p className="text-zinc-800 p-6 text-center text-[10px] font-mono tracking-wider">
                AWAITING SIGNAL...
              </p>
            ) : (
              <div className="divide-y divide-red-500/[0.03]">
                {filteredEvents.map((ev, i) => (
                  <div
                    key={i}
                    className="px-3 py-1 flex items-center gap-2.5 hover:bg-red-500/[0.02] transition-colors text-[11px] font-mono"
                  >
                    <span className="text-zinc-800 tabular-nums shrink-0 w-[60px] text-[10px]">
                      {formatTime(ev.timestamp)}
                    </span>
                    <span
                      className={`shrink-0 w-10 text-[9px] font-bold tracking-wider ${EVENT_COLORS[ev.type] ?? "text-zinc-700"}`}
                    >
                      {EVENT_LABELS[ev.type] ?? ev.type.toUpperCase().slice(0, 4)}
                    </span>
                    {ev.taskId && (
                      <code className="text-zinc-800 shrink-0 text-[10px]">
                        {ev.taskId.slice(0, 8)}
                      </code>
                    )}
                    <span className="text-zinc-600 truncate text-[10px]">{ev.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Intelligence Briefing */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-3 bg-red-500/20 rounded-[1px]" />
            <h2 className="text-[9px] font-mono font-bold text-zinc-600 tracking-[0.2em]">
              INTELLIGENCE
            </h2>
            <div className="flex-1 h-px bg-red-500/5" />
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-1 mb-2">
            <button
              onClick={() => setIntelTab("knowledge")}
              className={`px-2.5 py-0.5 rounded-sm text-[8px] font-mono font-bold tracking-wider transition-all border ${
                intelTab === "knowledge"
                  ? "text-red-400 border-red-500/25 bg-red-500/10"
                  : "text-zinc-700 border-zinc-800/50 hover:border-zinc-700 hover:text-zinc-500"
              }`}
            >
              KNOWLEDGE
            </button>
            <button
              onClick={() => setIntelTab("feedback")}
              className={`px-2.5 py-0.5 rounded-sm text-[8px] font-mono font-bold tracking-wider transition-all border ${
                intelTab === "feedback"
                  ? "text-red-400 border-red-500/25 bg-red-500/10"
                  : "text-zinc-700 border-zinc-800/50 hover:border-zinc-700 hover:text-zinc-500"
              }`}
            >
              FEEDBACK
            </button>
          </div>

          <div className="panel max-h-[28rem] overflow-y-auto">
            {intelTab === "knowledge" ? (
              recentKnowledge.length === 0 ? (
                <p className="text-zinc-800 p-6 text-center text-[10px] font-mono tracking-wider">
                  NO KNOWLEDGE ACQUIRED
                </p>
              ) : (
                <div className="divide-y divide-red-500/[0.03]">
                  {recentKnowledge.map((k) => (
                    <div key={k.id} className="px-3 py-2.5 hover:bg-red-500/[0.02] transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-1.5 py-0.5 rounded-sm text-[7px] font-mono font-bold tracking-wider border ${
                          TOPIC_COLORS[k.topic.toLowerCase()] ?? "text-zinc-400 bg-zinc-500/10 border-zinc-500/20"
                        }`}>
                          {k.topic.toUpperCase()}
                        </span>
                        <span className="text-[8px] font-mono text-zinc-700 tracking-wider">
                          {k.specialty.toUpperCase()}
                        </span>
                        <span className="text-[8px] font-mono text-zinc-800 ml-auto">
                          {formatRelative(k.timestamp)}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-zinc-500 leading-relaxed line-clamp-2">
                        {k.insight}
                      </p>
                    </div>
                  ))}
                </div>
              )
            ) : (
              recentFeedback.length === 0 ? (
                <p className="text-zinc-800 p-6 text-center text-[10px] font-mono tracking-wider">
                  NO FEEDBACK RECEIVED
                </p>
              ) : (
                <div className="divide-y divide-red-500/[0.03]">
                  {recentFeedback.map((f) => (
                    <div key={f.taskId} className="px-3 py-2.5 hover:bg-red-500/[0.02] transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[11px] font-mono font-bold readout ${
                          f.score >= 4 ? "text-green-400" : f.score >= 3 ? "text-amber-400" : "text-red-400"
                        }`}>
                          {f.score}/5
                        </span>
                        <span className="text-[8px] font-mono text-zinc-800 ml-auto">
                          {formatRelative(f.timestamp)}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-zinc-500 truncate mb-0.5">
                        {f.taskDescription}
                      </p>
                      {f.comments && (
                        <p className="text-[9px] font-mono text-zinc-700 truncate">
                          "{f.comments}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Readout({ label, value, lit }: { label: string; value: string; lit?: boolean }) {
  return (
    <div className="panel px-3 py-2">
      <p className="text-[8px] text-zinc-700 font-mono font-bold tracking-[0.2em] mb-0.5">{label}</p>
      <p
        className={`text-sm font-mono font-semibold readout truncate ${lit ? "text-red-400" : "text-zinc-400"}`}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

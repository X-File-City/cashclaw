import { useState, useEffect } from "react";
import { Dashboard } from "./pages/Dashboard.js";
import { Tasks } from "./pages/Tasks.js";
import { Chat } from "./pages/Chat.js";
import { Settings } from "./pages/Settings.js";
import { Setup } from "./pages/Setup.js";
import { api, type WalletInfo } from "./lib/api.js";

type Page = "dashboard" | "tasks" | "chat" | "settings";

const NAV: { page: Page; label: string; key: string }[] = [
  { page: "dashboard", label: "MONITOR", key: "01" },
  { page: "tasks", label: "OPS", key: "02" },
  { page: "chat", label: "COMMS", key: "03" },
  { page: "settings", label: "SYS", key: "04" },
];

export function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    api.getSetupStatus()
      .then((s) => setConfigured(s.configured && s.mode === "running"))
      .catch(() => setConfigured(false));
  }, []);

  if (configured === null) {
    return (
      <div className="min-h-screen flex items-center justify-center scanlines">
        <div className="text-center">
          <div className="w-10 h-10 border border-red-900/40 rounded-sm flex items-center justify-center mx-auto mb-4">
            <div className="w-3 h-3 border border-red-500/60 rounded-sm animate-spin" />
          </div>
          <p className="text-red-500/60 text-[10px] font-mono tracking-[0.3em] uppercase">System Init</p>
        </div>
      </div>
    );
  }

  if (!configured) {
    return <Setup onComplete={() => setConfigured(true)} />;
  }

  return (
    <div className="min-h-screen flex flex-col scanlines">
      {/* Header — NERV-style command bar */}
      <header className="border-b border-red-500/8 px-5 py-2.5 flex items-center justify-between bg-zinc-950/95 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          {/* Logo block */}
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-5 bg-red-500 rounded-[1px] glow-red" />
            <div>
              <h1 className="text-sm font-bold tracking-wide text-zinc-100 font-mono leading-none">
                CASHCLAW
              </h1>
              <p className="text-[8px] text-red-500/50 font-mono tracking-[0.25em] leading-none mt-0.5">
                AUTONOMOUS WORK AGENT
              </p>
            </div>
          </div>

          <div className="h-5 w-px bg-red-500/10" />

          {/* System time */}
          <SystemClock />

          <div className="h-5 w-px bg-red-500/10" />

          {/* Wallet */}
          <WalletIndicator />
        </div>

        {/* Nav */}
        <nav className="flex gap-0.5">
          {NAV.map((n) => (
            <button
              key={n.page}
              onClick={() => setPage(n.page)}
              className={`group px-3 py-1.5 rounded-sm text-[11px] font-mono font-medium transition-all duration-100 ${
                page === n.page
                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                  : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/50 border border-transparent"
              }`}
            >
              <span className={`mr-1.5 ${page === n.page ? "text-red-500/50" : "text-zinc-800"}`}>
                {n.key}
              </span>
              {n.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Main */}
      <main className="flex-1 p-5 max-w-6xl mx-auto w-full">
        {page === "dashboard" && <Dashboard />}
        {page === "tasks" && <Tasks />}
        {page === "chat" && <Chat />}
        {page === "settings" && <Settings />}
      </main>

      {/* Footer status bar */}
      <footer className="border-t border-red-500/5 px-5 py-1.5 flex items-center justify-between">
        <span className="text-[9px] text-zinc-800 font-mono tracking-wider">SYS.v0.1.0</span>
        <span className="text-[9px] text-red-500/20 font-mono tracking-wider">MOLTLAUNCH NETWORK</span>
      </footer>
    </div>
  );
}

function WalletIndicator() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);

  useEffect(() => {
    function fetchWallet() {
      api.getWallet().then(setWallet).catch(() => {});
    }
    fetchWallet();
    const interval = setInterval(fetchWallet, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!wallet) return null;

  const truncAddr = `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`;
  const bal = wallet.balance ? `${parseFloat(wallet.balance).toFixed(4)} ETH` : "";

  return (
    <div className="flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-green-500 glow-green" />
      <span className="text-[10px] font-mono text-zinc-600 tracking-wider">{truncAddr}</span>
      {bal && <span className="text-[10px] font-mono text-zinc-500 readout">{bal}</span>}
    </div>
  );
}

function SystemClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-[10px] font-mono text-zinc-700 tabular-nums tracking-wider">
      {time.toLocaleTimeString([], { hour12: false })}
    </span>
  );
}

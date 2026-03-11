import { useState } from "react";
import { api } from "../../lib/api.js";

interface SpecializationStepProps {
  onComplete: () => void;
}

const PRICING_STRATEGIES = [
  { value: "fixed", label: "FIXED", desc: "Same price per task" },
  { value: "complexity", label: "COMPLEXITY", desc: "Scales with difficulty" },
];

export function SpecializationStep({ onComplete }: SpecializationStepProps) {
  const [specialties, setSpecialties] = useState("");
  const [strategy, setStrategy] = useState("fixed");
  const [baseRate, setBaseRate] = useState("0.005");
  const [maxRate, setMaxRate] = useState("0.05");
  const [autoQuote, setAutoQuote] = useState(true);
  const [autoWork, setAutoWork] = useState(true);
  const [maxConcurrent, setMaxConcurrent] = useState(3);
  const [declineKeywords, setDeclineKeywords] = useState("");
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState("");

  async function handleLaunch() {
    setLaunching(true);
    setError("");
    try {
      await api.saveSpecialization({
        specialties: specialties.split(",").map((s) => s.trim()).filter(Boolean),
        pricing: { strategy, baseRateEth: baseRate, maxRateEth: maxRate },
        autoQuote,
        autoWork,
        maxConcurrentTasks: maxConcurrent,
        declineKeywords: declineKeywords.split(",").map((s) => s.trim()).filter(Boolean),
      });
      await api.completeSetup();
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to launch");
    } finally {
      setLaunching(false);
    }
  }

  const inputCls = "w-full bg-zinc-950 border border-red-500/10 rounded-sm px-3 py-2 text-[11px] font-mono text-zinc-400 focus:outline-none focus:border-red-500/25 transition-colors";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-mono font-bold text-zinc-200 mb-1">Deploy</h2>
        <p className="text-[11px] text-zinc-600 font-mono leading-relaxed">
          Configure expertise, pricing, and automation before launch.
        </p>
      </div>

      {error && (
        <div className="panel px-4 py-3 text-[11px] text-red-400 font-mono">{error}</div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-[8px] text-zinc-700 font-mono font-bold tracking-[0.2em] mb-1">SPECIALTIES</label>
          <input type="text" value={specialties} onChange={(e) => setSpecialties(e.target.value)} placeholder="typescript, react, solidity" className={inputCls} />
          <p className="text-[9px] text-zinc-800 mt-0.5 font-mono">Comma-separated</p>
        </div>

        <div>
          <label className="block text-[8px] text-zinc-700 font-mono font-bold tracking-[0.2em] mb-1.5">PRICING</label>
          <div className="grid grid-cols-2 gap-1.5">
            {PRICING_STRATEGIES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStrategy(s.value)}
                className={`px-3 py-2 rounded-sm text-left border transition-all duration-100 ${
                  strategy === s.value
                    ? "border-red-500/25 text-zinc-300 bg-red-500/5"
                    : "border-zinc-800 text-zinc-600 hover:border-zinc-700"
                }`}
              >
                <span className="block font-mono font-bold text-[9px] tracking-wider">{s.label}</span>
                <span className="block text-[9px] text-zinc-700 mt-0.5 font-mono">{s.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[8px] text-zinc-700 font-mono font-bold tracking-[0.2em] mb-1">BASE (ETH)</label>
            <input type="text" value={baseRate} onChange={(e) => setBaseRate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-[8px] text-zinc-700 font-mono font-bold tracking-[0.2em] mb-1">MAX (ETH)</label>
            <input type="text" value={maxRate} onChange={(e) => setMaxRate(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" checked={autoQuote} onChange={(e) => setAutoQuote(e.target.checked)} className="w-3.5 h-3.5 rounded-sm border-zinc-700 bg-zinc-900 accent-red-600" />
            <div>
              <span className="text-[11px] text-zinc-400 font-mono group-hover:text-zinc-300 transition-colors">Auto-quote</span>
              <p className="text-[9px] text-zinc-700 font-mono">Price tasks automatically</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" checked={autoWork} onChange={(e) => setAutoWork(e.target.checked)} className="w-3.5 h-3.5 rounded-sm border-zinc-700 bg-zinc-900 accent-red-600" />
            <div>
              <span className="text-[11px] text-zinc-400 font-mono group-hover:text-zinc-300 transition-colors">Auto-work</span>
              <p className="text-[9px] text-zinc-700 font-mono">Start on acceptance</p>
            </div>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[8px] text-zinc-700 font-mono font-bold tracking-[0.2em] mb-1">MAX CONCURRENT</label>
            <input type="number" value={maxConcurrent} onChange={(e) => setMaxConcurrent(parseInt(e.target.value) || 1)} min={1} max={10} className={inputCls} />
          </div>
          <div>
            <label className="block text-[8px] text-zinc-700 font-mono font-bold tracking-[0.2em] mb-1">DECLINE WORDS</label>
            <input type="text" value={declineKeywords} onChange={(e) => setDeclineKeywords(e.target.value)} placeholder="illegal, harmful" className={inputCls} />
          </div>
        </div>
      </div>

      <button
        onClick={handleLaunch}
        disabled={launching}
        className="w-full py-2.5 bg-red-600 text-white rounded-sm text-[11px] font-mono font-bold tracking-[0.15em] hover:bg-red-500 disabled:opacity-40 transition-colors"
      >
        {launching ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-3 h-3 border-2 border-red-300 border-t-white rounded-full animate-spin" />
            DEPLOYING...
          </span>
        ) : (
          "DEPLOY AGENT"
        )}
      </button>
    </div>
  );
}

import { useState } from "react";
import { api } from "../../lib/api.js";

interface RegisterStepProps {
  onNext: (agentId: string) => void;
}

type TokenChoice = "launch" | "existing" | "none";

export function RegisterStep({ onNext }: RegisterStepProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [price, setPrice] = useState("0.005");
  const [tokenChoice, setTokenChoice] = useState<TokenChoice>("none");
  const [symbol, setSymbol] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState("");
  const [agentId, setAgentId] = useState("");

  async function handleRegister() {
    if (!name.trim() || !description.trim()) return;
    setRegistering(true);
    setError("");
    try {
      const result = await api.registerAgent({
        name: name.trim(),
        description: description.trim(),
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        price: price.trim(),
        symbol: tokenChoice === "launch" ? symbol.trim() || undefined : undefined,
        token: tokenChoice === "existing" ? tokenAddress.trim() || undefined : undefined,
      });
      setAgentId(result.agentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setRegistering(false);
    }
  }

  if (agentId) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-mono font-bold text-zinc-200 mb-1">Registered</h2>
          <p className="text-[11px] text-zinc-600 font-mono">Agent is live on the marketplace.</p>
        </div>
        <div className="panel p-4">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-zinc-600">Agent ID</span>
            <span className="text-red-400">{agentId}</span>
          </div>
        </div>
        <button
          onClick={() => onNext(agentId)}
          className="w-full py-2.5 bg-zinc-100 text-zinc-900 rounded-sm text-[11px] font-mono font-bold tracking-wider hover:bg-white transition-colors"
        >
          CONTINUE
        </button>
      </div>
    );
  }

  const TOKEN_OPTIONS: { value: TokenChoice; label: string; desc: string }[] = [
    { value: "launch", label: "LAUNCH", desc: "Flaunch token" },
    { value: "existing", label: "EXISTING", desc: "ERC-20" },
    { value: "none", label: "NONE", desc: "ETH only" },
  ];

  const inputCls = "w-full bg-zinc-950 border border-red-500/10 rounded-sm px-3 py-2 text-[11px] font-mono text-zinc-400 focus:outline-none focus:border-red-500/25 transition-colors";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-mono font-bold text-zinc-200 mb-1">Register Agent</h2>
        <p className="text-[11px] text-zinc-600 font-mono leading-relaxed">
          Deploy to the marketplace. Accepts paid tasks 24/7 once live.
        </p>
      </div>

      {error && (
        <div className="panel px-4 py-3 text-[11px] text-red-400 font-mono">{error}</div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-[8px] text-zinc-700 font-mono font-bold tracking-[0.2em] mb-1">NAME</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Work Agent" className={inputCls} />
        </div>

        <div>
          <label className="block text-[8px] text-zinc-700 font-mono font-bold tracking-[0.2em] mb-1">DESCRIPTION</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does your agent do?" rows={3} className={`${inputCls} resize-none`} />
        </div>

        <div>
          <label className="block text-[8px] text-zinc-700 font-mono font-bold tracking-[0.2em] mb-1">SKILLS</label>
          <input type="text" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="typescript, react, solidity" className={inputCls} />
        </div>

        <div>
          <label className="block text-[8px] text-zinc-700 font-mono font-bold tracking-[0.2em] mb-1">BASE PRICE (ETH)</label>
          <input type="text" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.005" className={inputCls} />
        </div>

        <div>
          <label className="block text-[8px] text-zinc-700 font-mono font-bold tracking-[0.2em] mb-1.5">TOKEN</label>
          <div className="grid grid-cols-3 gap-1.5">
            {TOKEN_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTokenChoice(opt.value)}
                className={`px-3 py-2 rounded-sm text-left border transition-all duration-100 ${
                  tokenChoice === opt.value
                    ? "border-red-500/25 text-zinc-300 bg-red-500/5"
                    : "border-zinc-800 text-zinc-600 hover:border-zinc-700"
                }`}
              >
                <span className="block font-mono font-bold text-[9px] tracking-wider">{opt.label}</span>
                <span className="block text-[9px] text-zinc-700 mt-0.5 font-mono">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {tokenChoice === "launch" && (
          <div>
            <label className="block text-[8px] text-zinc-700 font-mono font-bold tracking-[0.2em] mb-1">SYMBOL</label>
            <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="WORK" maxLength={10} className={`${inputCls} uppercase`} />
          </div>
        )}

        {tokenChoice === "existing" && (
          <div>
            <label className="block text-[8px] text-zinc-700 font-mono font-bold tracking-[0.2em] mb-1">TOKEN ADDRESS</label>
            <input type="text" value={tokenAddress} onChange={(e) => setTokenAddress(e.target.value)} placeholder="0x..." className={inputCls} />
          </div>
        )}
      </div>

      <button
        onClick={handleRegister}
        disabled={registering || !name.trim() || !description.trim()}
        className="w-full py-2.5 bg-red-600 text-white rounded-sm text-[11px] font-mono font-bold tracking-wider hover:bg-red-500 disabled:opacity-40 transition-colors"
      >
        {registering ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-3 h-3 border-2 border-red-300 border-t-white rounded-full animate-spin" />
            REGISTERING ON-CHAIN...
          </span>
        ) : (
          "REGISTER"
        )}
      </button>

      {registering && (
        <p className="text-[9px] text-zinc-700 text-center font-mono tracking-wider">
          TX PENDING — MAY TAKE 30+ SECONDS
        </p>
      )}
    </div>
  );
}

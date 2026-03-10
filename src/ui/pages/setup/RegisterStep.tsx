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

  // Success state
  if (agentId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Registered!</h2>
          <p className="text-sm text-zinc-400">
            Your agent is live on the moltlaunch marketplace.
          </p>
        </div>
        <div className="bg-emerald-950/50 border border-emerald-800/60 rounded-lg p-4">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Agent ID</span>
            <span className="font-mono text-emerald-400">{agentId}</span>
          </div>
        </div>
        <button
          onClick={() => onNext(agentId)}
          className="w-full py-2.5 bg-zinc-100 text-zinc-900 rounded text-sm font-medium hover:bg-zinc-200"
        >
          Continue
        </button>
      </div>
    );
  }

  const TOKEN_OPTIONS: { value: TokenChoice; label: string; desc: string }[] = [
    { value: "launch", label: "Launch Token", desc: "Creates a Flaunch token for your agent" },
    { value: "existing", label: "Existing Token", desc: "Attach an ERC-20 on Base" },
    { value: "none", label: "No Token", desc: "Direct ETH payments only" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Register Agent</h2>
        <p className="text-sm text-zinc-400">
          Create an on-chain identity on the marketplace. This transaction
          takes ~30 seconds to confirm.
        </p>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Work Agent"
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
          />
          <p className="text-xs text-zinc-600 mt-1">Public name shown on the marketplace</p>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does your agent do?"
            rows={3}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 resize-none"
          />
          <p className="text-xs text-zinc-600 mt-1">Describe your agent's capabilities</p>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Skills</label>
          <input
            type="text"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="typescript, react, solidity"
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
          />
          <p className="text-xs text-zinc-600 mt-1">Comma-separated list of skills</p>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Base Price (ETH)</label>
          <input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.005"
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
          />
          <p className="text-xs text-zinc-600 mt-1">Default price per task in ETH</p>
        </div>

        {/* Token choice */}
        <div>
          <label className="block text-sm text-zinc-400 mb-2">Token</label>
          <div className="grid grid-cols-3 gap-2">
            {TOKEN_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTokenChoice(opt.value)}
                className={`px-3 py-2.5 rounded text-sm border transition-colors text-left ${
                  tokenChoice === opt.value
                    ? "border-zinc-100 text-zinc-100 bg-zinc-800"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                <span className="block font-medium text-xs">{opt.label}</span>
                <span className="block text-[11px] text-zinc-500 mt-0.5 leading-tight">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {tokenChoice === "launch" && (
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Token Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="WORK"
              maxLength={10}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 uppercase"
            />
            <p className="text-xs text-zinc-600 mt-1">2-10 characters, will be launched via Flaunch</p>
          </div>
        )}

        {tokenChoice === "existing" && (
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Token Contract Address</label>
            <input
              type="text"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              placeholder="0x..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-zinc-500"
            />
            <p className="text-xs text-zinc-600 mt-1">ERC-20 contract address on Base</p>
          </div>
        )}
      </div>

      <button
        onClick={handleRegister}
        disabled={registering || !name.trim() || !description.trim()}
        className="w-full py-2.5 bg-zinc-100 text-zinc-900 rounded text-sm font-medium hover:bg-zinc-200 disabled:opacity-50"
      >
        {registering ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
            Registering on-chain...
          </span>
        ) : (
          "Register Agent"
        )}
      </button>

      {registering && (
        <p className="text-xs text-zinc-500 text-center">
          This sends an on-chain transaction and can take 30+ seconds. Please wait.
        </p>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { api, type WalletInfo, type AgentInfo } from "../../lib/api.js";

interface WalletStepProps {
  onNext: (existingAgentId?: string) => void;
}

export function WalletStep({ onNext }: WalletStepProps) {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importKey, setImportKey] = useState("");
  const [importing, setImporting] = useState(false);

  const [existingAgent, setExistingAgent] = useState<AgentInfo | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  useEffect(() => {
    api.getWallet()
      .then((w) => {
        setWallet(w);
        lookupAgent();
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function lookupAgent() {
    setLookingUp(true);
    try {
      const { agent } = await api.lookupAgent();
      setExistingAgent(agent);
    } catch {
      // Not critical — just means no existing agent found
    } finally {
      setLookingUp(false);
    }
  }

  async function handleImport() {
    if (!importKey.trim()) return;
    setImporting(true);
    setError("");
    setExistingAgent(null);
    try {
      const w = await api.importWallet(importKey.trim());
      setWallet(w);
      setImportKey("");
      setShowImport(false);
      // Re-check for existing agent with new wallet
      setLookingUp(true);
      const { agent } = await api.lookupAgent();
      setExistingAgent(agent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
      setLookingUp(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block w-5 h-5 border-2 border-zinc-600 border-t-zinc-200 rounded-full animate-spin mb-3" />
        <p className="text-zinc-500 text-sm">Checking wallet...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Wallet</h2>
        <p className="text-sm text-zinc-400">
          Your agent needs a wallet to sign transactions on Base mainnet.
          A wallet has been auto-generated, or you can import your own key.
        </p>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {wallet && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-3">
          <div>
            <span className="text-xs text-zinc-500 uppercase tracking-wide">Address</span>
            <p className="font-mono text-sm text-zinc-200 mt-1 bg-zinc-800 rounded px-3 py-1.5 break-all">
              {wallet.address}
            </p>
          </div>
          {wallet.balance && (
            <div>
              <span className="text-xs text-zinc-500 uppercase tracking-wide">Balance</span>
              <p className="text-lg font-medium text-zinc-100 mt-0.5">
                {wallet.balance} <span className="text-sm text-zinc-400">ETH</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Existing agent detection */}
      {lookingUp && wallet && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <div className="w-3.5 h-3.5 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
          Checking for existing agent...
        </div>
      )}

      {existingAgent && (
        <div className="bg-emerald-950/50 border border-emerald-800/60 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-emerald-300">Existing Agent Found</h3>
            <span className="text-xs bg-emerald-900/60 text-emerald-400 px-2 py-0.5 rounded">
              Already registered
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Name</span>
              <span className="text-zinc-200 font-medium">{existingAgent.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Agent ID</span>
              <span className="font-mono text-zinc-300">{existingAgent.agentId}</span>
            </div>
            {existingAgent.skills.length > 0 && (
              <div className="flex justify-between items-start">
                <span className="text-zinc-400">Skills</span>
                <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                  {existingAgent.skills.map((s) => (
                    <span key={s} className="text-xs bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {existingAgent.flaunchToken && (
              <div className="flex justify-between">
                <span className="text-zinc-400">Token</span>
                <span className="font-mono text-zinc-300 text-xs">
                  {existingAgent.flaunchToken.slice(0, 6)}...{existingAgent.flaunchToken.slice(-4)}
                </span>
              </div>
            )}
            {existingAgent.reputation !== undefined && existingAgent.reputation > 0 && (
              <div className="flex justify-between">
                <span className="text-zinc-400">Reputation</span>
                <span className="text-zinc-200">{existingAgent.reputation}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => onNext(existingAgent.agentId)}
            className="w-full py-2.5 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-500 mt-2"
          >
            Use This Agent
          </button>
        </div>
      )}

      {/* Import wallet option */}
      {!wallet && !showImport && (
        <button
          onClick={() => setShowImport(true)}
          className="text-sm text-zinc-400 hover:text-zinc-200 underline"
        >
          Import existing private key
        </button>
      )}

      {wallet && !showImport && (
        <button
          onClick={() => setShowImport(true)}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Import a different private key
        </button>
      )}

      {showImport && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
          <label className="block text-sm text-zinc-400">Private Key</label>
          <input
            type="password"
            placeholder="0x..."
            value={importKey}
            onChange={(e) => setImportKey(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded text-sm font-medium hover:bg-zinc-200 disabled:opacity-50"
            >
              {importing ? "Importing..." : "Import"}
            </button>
            <button
              onClick={() => setShowImport(false)}
              className="px-4 py-2 text-zinc-400 text-sm hover:text-zinc-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Continue to registration (no existing agent) */}
      {wallet && !existingAgent && !lookingUp && (
        <button
          onClick={() => onNext()}
          className="w-full py-2.5 bg-zinc-100 text-zinc-900 rounded text-sm font-medium hover:bg-zinc-200"
        >
          Continue to Registration
        </button>
      )}
    </div>
  );
}

import { useState } from "react";
import { api } from "../../lib/api.js";

interface LLMStepProps {
  onNext: () => void;
}

const PROVIDERS = [
  { value: "anthropic", label: "Anthropic", desc: "Claude models — best for reasoning and code", model: "claude-sonnet-4-20250514" },
  { value: "openai", label: "OpenAI", desc: "GPT-4o and other OpenAI models", model: "gpt-4o" },
  { value: "openrouter", label: "OpenRouter", desc: "Access multiple providers through one API", model: "anthropic/claude-sonnet-4-20250514" },
];

export function LLMStep({ onNext }: LLMStepProps) {
  const [provider, setProvider] = useState("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(PROVIDERS[0].model);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testPassed, setTestPassed] = useState(false);
  const [error, setError] = useState("");

  function handleProviderChange(p: string) {
    setProvider(p);
    const prov = PROVIDERS.find((pr) => pr.value === p);
    setModel(prov?.model ?? "");
    setTestPassed(false);
    setTestResult(null);
  }

  async function handleTest() {
    if (!apiKey.trim()) return;
    setTesting(true);
    setError("");
    setTestResult(null);
    try {
      const result = await api.testLLM({ provider, model, apiKey });
      setTestResult(result.response);
      setTestPassed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection test failed");
      setTestPassed(false);
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await api.saveLLM({ provider, model, apiKey });
      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">LLM Configuration</h2>
        <p className="text-sm text-zinc-400">
          Connect an LLM provider to power your agent's reasoning and task execution.
        </p>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-2">Provider</label>
          <div className="space-y-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.value}
                onClick={() => handleProviderChange(p.value)}
                className={`w-full text-left px-4 py-3 rounded border transition-colors ${
                  provider === p.value
                    ? "border-zinc-100 bg-zinc-800"
                    : "border-zinc-700 hover:border-zinc-500"
                }`}
              >
                <span className={`block text-sm font-medium ${provider === p.value ? "text-zinc-100" : "text-zinc-300"}`}>
                  {p.label}
                </span>
                <span className="block text-xs text-zinc-500 mt-0.5">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setTestPassed(false); }}
            placeholder="sk-..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Model</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
          />
          <p className="text-xs text-zinc-600 mt-1">Model ID for the selected provider</p>
        </div>
      </div>

      <button
        onClick={handleTest}
        disabled={testing || !apiKey.trim()}
        className="w-full py-2 border border-zinc-700 rounded text-sm text-zinc-300 hover:bg-zinc-900 disabled:opacity-50"
      >
        {testing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-zinc-500 border-t-zinc-200 rounded-full animate-spin" />
            Testing connection...
          </span>
        ) : (
          "Test Connection"
        )}
      </button>

      {testResult && (
        <div className="bg-emerald-950/50 border border-emerald-800/60 rounded-lg px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wide">Connection successful</span>
          </div>
          <p className="text-zinc-300 text-xs italic">"{testResult.slice(0, 120)}"</p>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || !testPassed}
        className="w-full py-2.5 bg-zinc-100 text-zinc-900 rounded text-sm font-medium hover:bg-zinc-200 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Continue"}
      </button>
    </div>
  );
}

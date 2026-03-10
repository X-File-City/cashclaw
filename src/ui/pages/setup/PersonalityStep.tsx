import { useState } from "react";
import { api } from "../../lib/api.js";

interface PersonalityStepProps {
  onComplete: () => void;
}

const TONES = [
  { value: "professional", label: "Professional", desc: "Formal, business-appropriate" },
  { value: "casual", label: "Casual", desc: "Relaxed, conversational" },
  { value: "friendly", label: "Friendly", desc: "Warm, approachable" },
  { value: "technical", label: "Technical", desc: "Precise, detail-oriented" },
];

const STYLES = [
  { value: "concise", label: "Concise", desc: "Brief and to the point" },
  { value: "detailed", label: "Detailed", desc: "Thorough explanations" },
  { value: "balanced", label: "Balanced", desc: "Right amount of detail" },
];

export function PersonalityStep({ onComplete }: PersonalityStepProps) {
  const [tone, setTone] = useState("professional");
  const [responseStyle, setResponseStyle] = useState("balanced");
  const [customInstructions, setCustomInstructions] = useState("");
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState("");

  async function handleLaunch() {
    setLaunching(true);
    setError("");
    try {
      await api.savePersonality({
        tone,
        responseStyle,
        customInstructions: customInstructions.trim() || undefined,
      });
      await api.completeSetup();
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to launch");
    } finally {
      setLaunching(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Personality</h2>
        <p className="text-sm text-zinc-400">
          Configure how your agent communicates with clients. This affects
          quoting messages, status updates, and task discussions.
        </p>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label className="block text-sm text-zinc-400 mb-2">Tone</label>
          <div className="grid grid-cols-2 gap-2">
            {TONES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTone(t.value)}
                className={`px-3 py-2.5 rounded text-sm border transition-colors text-left ${
                  tone === t.value
                    ? "border-zinc-100 text-zinc-100 bg-zinc-800"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                <span className="block font-medium">{t.label}</span>
                <span className="block text-xs text-zinc-500 mt-0.5">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-2">Response Style</label>
          <div className="grid grid-cols-3 gap-2">
            {STYLES.map((s) => (
              <button
                key={s.value}
                onClick={() => setResponseStyle(s.value)}
                className={`px-3 py-2.5 rounded text-sm border transition-colors text-left ${
                  responseStyle === s.value
                    ? "border-zinc-100 text-zinc-100 bg-zinc-800"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                <span className="block font-medium">{s.label}</span>
                <span className="block text-xs text-zinc-500 mt-0.5">{s.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">
            Custom Instructions
          </label>
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="Any additional instructions for your agent..."
            rows={4}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 resize-none"
          />
          <p className="text-xs text-zinc-600 mt-1">Optional system-level instructions appended to every LLM call</p>
        </div>
      </div>

      <button
        onClick={handleLaunch}
        disabled={launching}
        className="w-full py-2.5 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
      >
        {launching ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-emerald-300 border-t-white rounded-full animate-spin" />
            Launching...
          </span>
        ) : (
          "Launch Agent"
        )}
      </button>
    </div>
  );
}

import { useState, useEffect } from "react";
import { api, type ConfigData, type AgentInfo, type PersonalityData } from "../lib/api.js";

interface FormState {
  specialties: string;
  declineKeywords: string;
  strategy: string;
  baseRate: string;
  maxRate: string;
  maxTasks: number;
  autoQuote: boolean;
  autoWork: boolean;
  learningEnabled: boolean;
  agentCashEnabled: boolean;
  tone: PersonalityData["tone"];
  responseStyle: PersonalityData["responseStyle"];
  customInstructions: string;
  studyIntervalMin: number;
  pollIntervalSec: number;
  urgentPollIntervalSec: number;
  llmProvider: string;
  llmModel: string;
  llmApiKey: string;
}

function configToForm(c: ConfigData): FormState {
  return {
    specialties: c.specialties.join(", "),
    declineKeywords: c.declineKeywords.join(", "),
    strategy: c.pricing.strategy,
    baseRate: c.pricing.baseRateEth,
    maxRate: c.pricing.maxRateEth,
    maxTasks: c.maxConcurrentTasks,
    autoQuote: c.autoQuote,
    autoWork: c.autoWork,
    learningEnabled: c.learningEnabled,
    agentCashEnabled: c.agentCashEnabled ?? false,
    tone: c.personality?.tone ?? "professional",
    responseStyle: c.personality?.responseStyle ?? "concise",
    customInstructions: c.personality?.customInstructions ?? "",
    studyIntervalMin: Math.round(c.studyIntervalMs / 60000),
    pollIntervalSec: Math.round(c.polling.intervalMs / 1000),
    urgentPollIntervalSec: Math.round(c.polling.urgentIntervalMs / 1000),
    llmProvider: c.llm.provider,
    llmModel: c.llm.model,
    llmApiKey: c.llm.apiKey,
  };
}

export function Settings() {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [llmTesting, setLlmTesting] = useState(false);
  const [llmTestResult, setLlmTestResult] = useState("");

  useEffect(() => {
    api.getConfig().then((c) => {
      setConfig(c);
      setForm(configToForm(c));
    }).catch(() => {});
    api.getAgentInfo().then((r) => setAgentInfo(r.agent)).catch(() => {});
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  async function save() {
    if (!form || !config) return;
    setSaving(true);
    setMessage("");
    try {
      const llmChanged =
        form.llmProvider !== config.llm.provider ||
        form.llmModel !== config.llm.model ||
        (form.llmApiKey !== "***" && form.llmApiKey !== config.llm.apiKey);

      await api.updateConfig({
        specialties: form.specialties.split(",").map((s) => s.trim()).filter(Boolean),
        declineKeywords: form.declineKeywords.split(",").map((s) => s.trim()).filter(Boolean),
        pricing: { strategy: form.strategy, baseRateEth: form.baseRate, maxRateEth: form.maxRate },
        autoQuote: form.autoQuote,
        autoWork: form.autoWork,
        maxConcurrentTasks: form.maxTasks,
        learningEnabled: form.learningEnabled,
        agentCashEnabled: form.agentCashEnabled,
        personality: {
          tone: form.tone,
          responseStyle: form.responseStyle,
          customInstructions: form.customInstructions || undefined,
        },
        studyIntervalMs: form.studyIntervalMin * 60000,
        polling: {
          intervalMs: form.pollIntervalSec * 1000,
          urgentIntervalMs: form.urgentPollIntervalSec * 1000,
        },
        ...(llmChanged ? {
          llm: {
            provider: form.llmProvider,
            model: form.llmModel,
            apiKey: form.llmApiKey,
          },
        } : {}),
      });
      setMessage("SAVED");
      setTimeout(() => setMessage(""), 2000);
      const fresh = await api.getConfig();
      setConfig(fresh);
    } catch {
      setMessage("FAILED");
    } finally {
      setSaving(false);
    }
  }

  async function testLlm() {
    if (!form) return;
    setLlmTesting(true);
    setLlmTestResult("");
    try {
      const result = await api.testLLM({
        provider: form.llmProvider,
        model: form.llmModel,
        apiKey: form.llmApiKey === "***" ? config?.llm.apiKey ?? "" : form.llmApiKey,
      });
      setLlmTestResult(result.response);
    } catch (err) {
      setLlmTestResult(err instanceof Error ? err.message : "Test failed");
    } finally {
      setLlmTesting(false);
    }
  }

  if (!config || !form) {
    return (
      <div className="text-center py-24">
        <div className="w-6 h-6 border border-red-900/40 rounded-sm animate-spin mx-auto mb-4" />
        <p className="text-red-500/40 text-[10px] font-mono tracking-[0.3em]">LOADING CONFIG</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-16">
      {/* ── Hero: Agent Identity ── */}
      <div className="panel px-5 py-4">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            {/* Avatar / glyph */}
            <div className="w-11 h-11 rounded-sm border border-red-500/15 bg-red-500/5 flex items-center justify-center shrink-0">
              <span className="text-red-500/60 text-lg font-mono font-bold">
                {(agentInfo?.name ?? config.agentId)?.[0]?.toUpperCase() ?? "?"}
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-mono font-bold text-zinc-200 tracking-wide truncate">
                {agentInfo?.name ?? config.agentId}
              </h2>
              {agentInfo?.description && (
                <p className="text-[10px] font-mono text-zinc-600 mt-0.5 truncate">
                  {agentInfo.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[9px] font-mono text-zinc-700 tracking-wider">
                  {config.agentId.slice(0, 16)}...
                </span>
                <span className="text-[9px] font-mono text-zinc-800">
                  {config.llm.provider}/{config.llm.model}
                </span>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex gap-3 shrink-0">
            {agentInfo?.reputation !== undefined && (
              <MiniReadout label="REP" value={String(agentInfo.reputation)} />
            )}
            {agentInfo?.priceEth && (
              <MiniReadout label="PRICE" value={`${agentInfo.priceEth}`} />
            )}
            {agentInfo?.skills && (
              <MiniReadout label="SKILLS" value={String(agentInfo.skills.length)} />
            )}
          </div>
        </div>

        {/* Skill tags */}
        {agentInfo?.skills && agentInfo.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-red-500/[0.06]">
            {agentInfo.skills.map((s) => (
              <span
                key={s}
                className="px-2 py-0.5 rounded-sm text-[9px] font-mono font-medium tracking-wider text-red-400/60 bg-red-500/[0.06] border border-red-500/[0.08]"
              >
                {s.toUpperCase()}
              </span>
            ))}
          </div>
        )}

        {agentInfo && (
          <p className="text-[8px] text-zinc-800 font-mono mt-2 tracking-wider">
            ON-CHAIN IDENTITY — UPDATE VIA CONTRACT
          </p>
        )}
      </div>

      {/* ── Two-Column Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Left Column ── */}
        <div className="space-y-4">
          {/* LLM */}
          <SectionPanel title="LLM ENGINE">
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <Field label="PROVIDER">
                  <select value={form.llmProvider} onChange={(e) => update("llmProvider", e.target.value)} className={inputClass}>
                    <option value="anthropic">ANTHROPIC</option>
                    <option value="openai">OPENAI</option>
                    <option value="openrouter">OPENROUTER</option>
                  </select>
                </Field>
                <Field label="MODEL">
                  <input
                    type="text"
                    value={form.llmModel}
                    onChange={(e) => update("llmModel", e.target.value)}
                    placeholder="claude-sonnet-4-20250514"
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="API KEY">
                <input
                  type="password"
                  value={form.llmApiKey}
                  onChange={(e) => update("llmApiKey", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => void testLlm()}
                  disabled={llmTesting}
                  className="px-3 py-1.5 rounded-sm text-[9px] font-mono font-bold tracking-wider transition-all disabled:opacity-30 text-zinc-500 border border-zinc-700/60 hover:border-red-500/20 hover:text-red-400/60 bg-zinc-900/40"
                >
                  {llmTesting ? "TESTING..." : "TEST CONNECTION"}
                </button>
                {llmTestResult && (
                  <span className="text-[9px] font-mono text-zinc-600 truncate flex-1">
                    {llmTestResult.slice(0, 80)}
                  </span>
                )}
              </div>
            </div>
          </SectionPanel>

          {/* Expertise */}
          <SectionPanel title="EXPERTISE">
            <div className="space-y-2.5">
              <Field label="SPECIALTIES" hint="comma-separated">
                <input
                  type="text"
                  value={form.specialties}
                  onChange={(e) => update("specialties", e.target.value)}
                  placeholder="typescript, react, solidity"
                  className={inputClass}
                />
              </Field>
              <Field label="DECLINE KEYWORDS" hint="auto-reject matching tasks">
                <input
                  type="text"
                  value={form.declineKeywords}
                  onChange={(e) => update("declineKeywords", e.target.value)}
                  placeholder="nsfw, illegal, gambling"
                  className={inputClass}
                />
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="STRATEGY">
                  <select value={form.strategy} onChange={(e) => update("strategy", e.target.value)} className={inputClass}>
                    <option value="fixed">FIXED</option>
                    <option value="complexity">COMPLEXITY</option>
                  </select>
                </Field>
                <Field label="BASE (ETH)">
                  <input type="text" value={form.baseRate} onChange={(e) => update("baseRate", e.target.value)} className={inputClass} />
                </Field>
                <Field label="MAX (ETH)">
                  <input type="text" value={form.maxRate} onChange={(e) => update("maxRate", e.target.value)} className={inputClass} />
                </Field>
              </div>
              <Field label="MAX CONCURRENT">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={form.maxTasks}
                  onChange={(e) => update("maxTasks", Number(e.target.value))}
                  className={inputClass}
                />
              </Field>
            </div>
          </SectionPanel>
        </div>

        {/* ── Right Column ── */}
        <div className="space-y-4">
          {/* Automation — toggle cards */}
          <SectionPanel title="AUTOMATION">
            <div className="grid grid-cols-2 gap-2">
              <ToggleCard
                label="AUTO.QUOTE"
                description="Quote incoming tasks automatically"
                checked={form.autoQuote}
                onChange={(v) => update("autoQuote", v)}
              />
              <ToggleCard
                label="AUTO.WORK"
                description="Start work on accepted tasks"
                checked={form.autoWork}
                onChange={(v) => update("autoWork", v)}
              />
              <ToggleCard
                label="LEARNING"
                description="Run study sessions when idle"
                checked={form.learningEnabled}
                onChange={(v) => update("learningEnabled", v)}
              />
              <ToggleCard
                label="AGENTCASH"
                description="Paid APIs: search, scrape, image gen, email"
                checked={form.agentCashEnabled}
                onChange={(v) => update("agentCashEnabled", v)}
              />
            </div>
          </SectionPanel>

          {/* Personality */}
          <SectionPanel title="PERSONALITY">
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <Field label="TONE">
                  <select value={form.tone} onChange={(e) => update("tone", e.target.value as PersonalityData["tone"])} className={inputClass}>
                    <option value="professional">PROFESSIONAL</option>
                    <option value="casual">CASUAL</option>
                    <option value="friendly">FRIENDLY</option>
                    <option value="technical">TECHNICAL</option>
                  </select>
                </Field>
                <Field label="RESPONSE STYLE">
                  <select value={form.responseStyle} onChange={(e) => update("responseStyle", e.target.value as PersonalityData["responseStyle"])} className={inputClass}>
                    <option value="concise">CONCISE</option>
                    <option value="detailed">DETAILED</option>
                    <option value="balanced">BALANCED</option>
                  </select>
                </Field>
              </div>
              <Field label="CUSTOM INSTRUCTIONS" hint="freeform personality guidance">
                <textarea
                  value={form.customInstructions}
                  onChange={(e) => update("customInstructions", e.target.value)}
                  placeholder="Always end messages with an encouraging note..."
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </Field>
            </div>
          </SectionPanel>

          {/* Timing */}
          <SectionPanel title="TIMING">
            <div className="grid grid-cols-3 gap-2">
              <TimingCard label="STUDY" unit="min" value={form.studyIntervalMin} min={1} max={1440} onChange={(v) => update("studyIntervalMin", v)} />
              <TimingCard label="POLL" unit="sec" value={form.pollIntervalSec} min={5} max={600} onChange={(v) => update("pollIntervalSec", v)} />
              <TimingCard label="URGENT" unit="sec" value={form.urgentPollIntervalSec} min={3} max={120} onChange={(v) => update("urgentPollIntervalSec", v)} />
            </div>
          </SectionPanel>

          {/* Activity Log */}
          <LogViewer />
        </div>
      </div>

      {/* ── Sticky Save Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-red-500/8 bg-zinc-950/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-5 py-2.5 flex items-center justify-between">
          <span className="text-[9px] font-mono text-zinc-800 tracking-wider">
            SYS.CONFIG — {config.agentId.slice(0, 12)}
          </span>
          <div className="flex items-center gap-3">
            {message && (
              <span className={`text-[10px] font-mono font-bold tracking-wider ${message === "SAVED" ? "text-green-500" : "text-red-500"}`}>
                {message}
              </span>
            )}
            <button
              onClick={() => void save()}
              disabled={saving}
              className="px-5 py-1.5 rounded-sm text-[10px] font-mono font-bold tracking-[0.15em] transition-all duration-100 disabled:opacity-30 text-red-500 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10"
            >
              {saving ? "WRITING..." : "APPLY CHANGES"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogViewer() {
  const [log, setLog] = useState<string>("");

  useEffect(() => {
    api.getLogs().then((r) => setLog(r.log)).catch(() => {});
  }, []);

  return (
    <SectionPanel title="ACTIVITY LOG">
      <div className="max-h-64 overflow-y-auto rounded-sm bg-zinc-950 border border-red-500/[0.06]">
        {log ? (
          <pre className="text-[10px] font-mono text-zinc-500 p-3 whitespace-pre-wrap leading-relaxed">
            {log}
          </pre>
        ) : (
          <p className="text-zinc-800 p-4 text-center text-[10px] font-mono tracking-wider">
            NO LOG ENTRIES TODAY
          </p>
        )}
      </div>
    </SectionPanel>
  );
}

/* ── Primitives ── */

const inputClass = "w-full bg-zinc-950 border border-red-500/10 rounded-sm px-3 py-2 text-[11px] font-mono text-zinc-400 focus:outline-none focus:border-red-500/25 transition-colors";

function SectionPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-0.5 h-2.5 bg-red-500/20 rounded-[1px]" />
        <span className="text-[8px] font-mono font-bold text-zinc-600 tracking-[0.2em]">{title}</span>
        <div className="flex-1 h-px bg-red-500/[0.04]" />
      </div>
      {children}
    </div>
  );
}

function MiniReadout({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="text-[7px] text-zinc-700 font-mono font-bold tracking-[0.2em]">{label}</p>
      <p className="text-[13px] font-mono font-semibold text-zinc-400 readout">{value}</p>
    </div>
  );
}

function ToggleCard({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`text-left p-3 rounded-sm border transition-all ${
        checked
          ? "border-red-500/15 bg-red-500/[0.04]"
          : "border-zinc-800/60 bg-zinc-900/30 opacity-60"
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-mono font-bold tracking-wider text-zinc-500">{label}</span>
        <div className={`w-2 h-2 rounded-full transition-colors ${checked ? "bg-red-500 glow-red" : "bg-zinc-800 border border-zinc-700"}`} />
      </div>
      <p className="text-[8px] font-mono text-zinc-700 leading-relaxed">{description}</p>
    </button>
  );
}

function TimingCard({
  label,
  unit,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="p-3 rounded-sm border border-zinc-800/40 bg-zinc-900/20">
      <p className="text-[7px] font-mono font-bold tracking-[0.2em] text-zinc-700 mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-transparent text-lg font-mono font-semibold text-zinc-400 readout focus:outline-none focus:text-red-400/80 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-[8px] font-mono text-zinc-700 shrink-0">{unit}</span>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[8px] text-zinc-700 font-mono font-bold tracking-[0.2em] block mb-1">
        {label}
        {hint && <span className="text-zinc-800 font-normal tracking-normal ml-1">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

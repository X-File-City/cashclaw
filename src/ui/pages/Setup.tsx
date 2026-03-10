import { useState, useMemo } from "react";
import { WalletStep } from "./setup/WalletStep.js";
import { RegisterStep } from "./setup/RegisterStep.js";
import { LLMStep } from "./setup/LLMStep.js";
import { PersonalityStep } from "./setup/PersonalityStep.js";

type StepId = "wallet" | "register" | "llm" | "personality";

interface StepDef {
  id: StepId;
  label: string;
}

const ALL_STEPS: StepDef[] = [
  { id: "wallet", label: "Wallet" },
  { id: "register", label: "Register" },
  { id: "llm", label: "LLM" },
  { id: "personality", label: "Personality" },
];

interface SetupProps {
  onComplete: () => void;
}

export function Setup({ onComplete }: SetupProps) {
  const [step, setStep] = useState(0);
  const [agentId, setAgentId] = useState("");
  const [skipRegister, setSkipRegister] = useState(false);

  const steps = useMemo(
    () => (skipRegister ? ALL_STEPS.filter((s) => s.id !== "register") : ALL_STEPS),
    [skipRegister],
  );

  function next() {
    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  }

  function handleWalletNext(existingAgentId?: string) {
    if (existingAgentId) {
      setAgentId(existingAgentId);
      setSkipRegister(true);
      // Next step after wallet is LLM when skipping register.
      // Since skipRegister will filter out register, step 1 becomes LLM.
      setStep(1);
    } else {
      next();
    }
  }

  const currentStepId = steps[step]?.id;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight">WorkClaw</h1>
          <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded">Setup</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 py-12">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-10">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  i < step
                    ? "bg-emerald-600 text-white"
                    : i === step
                      ? "bg-zinc-100 text-zinc-900"
                      : "bg-zinc-800 text-zinc-500"
                }`}
              >
                {i < step ? "\u2713" : i + 1}
              </div>
              <span
                className={`text-sm ${
                  i === step ? "text-zinc-100" : "text-zinc-500"
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div className="w-8 h-px bg-zinc-700" />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="w-full max-w-lg">
          {currentStepId === "wallet" && <WalletStep onNext={handleWalletNext} />}
          {currentStepId === "register" && (
            <RegisterStep
              onNext={(id) => {
                setAgentId(id);
                next();
              }}
            />
          )}
          {currentStepId === "llm" && <LLMStep onNext={next} />}
          {currentStepId === "personality" && <PersonalityStep onComplete={onComplete} />}
        </div>
      </main>
    </div>
  );
}

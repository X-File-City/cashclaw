const BASE = "";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(body.error ?? `API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(data.error ?? `API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// --- Dashboard types ---

export interface StatusData {
  running: boolean;
  activeTasks: number;
  totalPolls: number;
  lastPoll: number;
  startedAt: number;
  uptime: number;
  agentId: string;
}

export interface ActivityEvent {
  timestamp: number;
  type: string;
  taskId?: string;
  message: string;
}

export interface TaskData {
  id: string;
  task: string;
  status: string;
  quotedPriceWei?: string;
  ratedScore?: number;
  result?: string;
}

export interface StatsData {
  totalTasks: number;
  avgScore: number;
  completionRate: number;
}

export interface ConfigData {
  agentId: string;
  llm: { provider: string; model: string; apiKey: string };
  specialties: string[];
  pricing: { strategy: string; baseRateEth: string; maxRateEth: string };
  autoQuote: boolean;
  autoWork: boolean;
  maxConcurrentTasks: number;
  declineKeywords: string[];
}

// --- Setup types ---

export interface SetupStatus {
  configured: boolean;
  mode: "setup" | "running";
  step: string;
}

export interface WalletInfo {
  address: string;
  balance?: string;
}

export interface RegisterResult {
  agentId: string;
  txHash?: string;
}

export interface AgentInfo {
  agentId: string;
  name: string;
  description: string;
  skills: string[];
  priceEth: string;
  owner: string;
  flaunchToken?: string;
  reputation?: number;
}

export interface LLMTestResult {
  ok: boolean;
  response: string;
}

// --- API ---

export const api = {
  // Dashboard
  getStatus: () => get<StatusData>("/api/status"),
  getTasks: () => get<{ tasks: TaskData[]; events: ActivityEvent[] }>("/api/tasks"),
  getLogs: () => get<{ log: string }>("/api/logs"),
  getConfig: () => get<ConfigData>("/api/config"),
  getStats: () => get<StatsData>("/api/stats"),
  stop: () => post<{ ok: boolean }>("/api/stop"),
  start: () => post<{ ok: boolean }>("/api/start"),
  updateConfig: (updates: Partial<ConfigData>) =>
    post<{ ok: boolean }>("/api/config-update", updates),

  // Setup
  getSetupStatus: () => get<SetupStatus>("/api/setup/status"),
  getWallet: () => get<WalletInfo>("/api/setup/wallet"),
  importWallet: (privateKey: string) =>
    post<WalletInfo>("/api/setup/wallet/import", { privateKey }),
  lookupAgent: () => get<{ agent: AgentInfo | null }>("/api/setup/agent-lookup"),
  registerAgent: (opts: {
    name: string;
    description: string;
    skills: string[];
    price: string;
    symbol?: string;
    token?: string;
  }) => post<RegisterResult>("/api/setup/register", opts),
  saveLLM: (llm: { provider: string; model: string; apiKey: string }) =>
    post<{ ok: boolean }>("/api/setup/llm", llm),
  testLLM: (llm: { provider: string; model: string; apiKey: string }) =>
    post<LLMTestResult>("/api/setup/llm/test", llm),
  savePersonality: (personality: {
    tone: string;
    responseStyle: string;
    customInstructions?: string;
  }) => post<{ ok: boolean }>("/api/setup/personality", personality),
  completeSetup: () => post<{ ok: boolean; mode: string }>("/api/setup/complete"),
};

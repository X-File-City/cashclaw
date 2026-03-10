import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import {
  loadConfig,
  savePartialConfig,
  isConfigured,
  type WorkClawConfig,
  type LLMConfig,
  type PersonalityConfig,
} from "./config.js";
import { createLLMProvider } from "./llm/index.js";
import { createHeartbeat, type Heartbeat } from "./heartbeat.js";
import { readTodayLog } from "./memory/log.js";
import { getFeedbackStats } from "./memory/feedback.js";
import * as cli from "./moltlaunch/cli.js";

const PORT = 3777;

type ServerMode = "setup" | "running";

interface ServerContext {
  mode: ServerMode;
  config: WorkClawConfig | null;
  heartbeat: Heartbeat | null;
}

export async function startAgent(): Promise<http.Server> {
  const configured = isConfigured();
  const config = configured ? loadConfig() : null;

  const ctx: ServerContext = {
    mode: configured ? "running" : "setup",
    config,
    heartbeat: null,
  };

  // If already configured, start the heartbeat immediately
  if (ctx.mode === "running" && ctx.config) {
    const llm = createLLMProvider(ctx.config.llm);
    ctx.heartbeat = createHeartbeat(ctx.config, llm);
    ctx.heartbeat.start();
  }

  const server = createServer(ctx);
  return server;
}

function createServer(ctx: ServerContext): http.Server {
  const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

    if (url.pathname.startsWith("/api/")) {
      handleApi(url.pathname, req, res, ctx);
      return;
    }

    serveStatic(url.pathname, res);
  });

  server.listen(PORT, () => {
    console.log(`Dashboard: http://localhost:${PORT}`);
  });

  return server;
}

function json(res: http.ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function handleApi(
  pathname: string,
  req: http.IncomingMessage,
  res: http.ServerResponse,
  ctx: ServerContext,
) {
  // Setup endpoints — available in both modes
  if (pathname.startsWith("/api/setup/")) {
    handleSetupApi(pathname, req, res, ctx);
    return;
  }

  // Running-mode endpoints require config + heartbeat
  if (!ctx.config || !ctx.heartbeat) {
    json(res, { error: "Agent not configured", mode: "setup" }, 503);
    return;
  }

  switch (pathname) {
    case "/api/status":
      json(res, {
        running: ctx.heartbeat.state.running,
        activeTasks: ctx.heartbeat.state.activeTasks.size,
        totalPolls: ctx.heartbeat.state.totalPolls,
        lastPoll: ctx.heartbeat.state.lastPoll,
        startedAt: ctx.heartbeat.state.startedAt,
        uptime: ctx.heartbeat.state.running
          ? Date.now() - ctx.heartbeat.state.startedAt
          : 0,
        agentId: ctx.config.agentId,
      });
      break;

    case "/api/tasks":
      json(res, {
        tasks: [...ctx.heartbeat.state.activeTasks.values()],
        events: ctx.heartbeat.state.events.slice(-50),
      });
      break;

    case "/api/logs":
      json(res, { log: readTodayLog() });
      break;

    case "/api/config":
      json(res, {
        ...ctx.config,
        llm: { ...ctx.config.llm, apiKey: "***" },
      });
      break;

    case "/api/stats":
      json(res, getFeedbackStats());
      break;

    case "/api/stop":
      if (req.method !== "POST") { json(res, { error: "POST only" }, 405); return; }
      ctx.heartbeat.stop();
      json(res, { ok: true, running: false });
      break;

    case "/api/start":
      if (req.method !== "POST") { json(res, { error: "POST only" }, 405); return; }
      ctx.heartbeat.start();
      json(res, { ok: true, running: true });
      break;

    case "/api/config-update":
      if (req.method !== "POST") { json(res, { error: "POST only" }, 405); return; }
      handleConfigUpdate(req, res, ctx);
      break;

    default:
      json(res, { error: "Not found" }, 404);
  }
}

async function handleSetupApi(
  pathname: string,
  req: http.IncomingMessage,
  res: http.ServerResponse,
  ctx: ServerContext,
) {
  try {
    switch (pathname) {
      case "/api/setup/status":
        json(res, {
          configured: isConfigured(),
          mode: ctx.mode,
          step: detectCurrentStep(ctx),
        });
        break;

      case "/api/setup/wallet": {
        const wallet = await cli.walletShow();
        json(res, wallet);
        break;
      }

      case "/api/setup/agent-lookup": {
        const wallet = await cli.walletShow();
        const agent = await cli.getAgentByWallet(wallet.address);
        json(res, { agent });
        break;
      }

      case "/api/setup/wallet/import": {
        if (req.method !== "POST") { json(res, { error: "POST only" }, 405); return; }
        const body = JSON.parse(await readBody(req)) as { privateKey: string };
        const wallet = await cli.walletImport(body.privateKey);
        json(res, wallet);
        break;
      }

      case "/api/setup/register": {
        if (req.method !== "POST") { json(res, { error: "POST only" }, 405); return; }
        const body = JSON.parse(await readBody(req)) as {
          name: string;
          description: string;
          skills: string[];
          price: string;
          symbol?: string;
          token?: string;
        };
        const result = await cli.registerAgent(body);
        // Save agentId to config
        savePartialConfig({ agentId: result.agentId });
        ctx.config = loadConfig();
        json(res, result);
        break;
      }

      case "/api/setup/llm": {
        if (req.method !== "POST") { json(res, { error: "POST only" }, 405); return; }
        const body = JSON.parse(await readBody(req)) as LLMConfig;
        savePartialConfig({ llm: body });
        ctx.config = loadConfig();
        json(res, { ok: true });
        break;
      }

      case "/api/setup/llm/test": {
        if (req.method !== "POST") { json(res, { error: "POST only" }, 405); return; }
        const body = JSON.parse(await readBody(req)) as LLMConfig;
        const llm = createLLMProvider(body);
        const response = await llm.chat([
          { role: "user", content: "Say hello in one sentence." },
        ]);
        const text = response.content
          .filter((b): b is { type: "text"; text: string } => b.type === "text")
          .map((b) => b.text)
          .join("");
        json(res, { ok: true, response: text });
        break;
      }

      case "/api/setup/personality": {
        if (req.method !== "POST") { json(res, { error: "POST only" }, 405); return; }
        const body = JSON.parse(await readBody(req)) as PersonalityConfig;
        savePartialConfig({ personality: body });
        ctx.config = loadConfig();
        json(res, { ok: true });
        break;
      }

      case "/api/setup/complete": {
        if (req.method !== "POST") { json(res, { error: "POST only" }, 405); return; }

        if (!isConfigured()) {
          json(res, { error: "Configuration incomplete" }, 400);
          return;
        }

        ctx.config = loadConfig()!;
        const llm = createLLMProvider(ctx.config.llm);
        ctx.heartbeat = createHeartbeat(ctx.config, llm);
        ctx.heartbeat.start();
        ctx.mode = "running";

        json(res, { ok: true, mode: "running" });
        break;
      }

      default:
        json(res, { error: "Not found" }, 404);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    json(res, { error: msg }, 500);
  }
}

/** Detect which setup step the user is on based on current config state */
function detectCurrentStep(ctx: ServerContext): string {
  if (!ctx.config) return "wallet";
  if (!ctx.config.agentId) return "register";
  if (!ctx.config.llm?.apiKey) return "llm";
  return "personality";
}

async function handleConfigUpdate(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  ctx: ServerContext,
) {
  try {
    const body = await readBody(req);
    const updates = JSON.parse(body) as Partial<WorkClawConfig>;

    if (!ctx.config) {
      json(res, { error: "No config" }, 400);
      return;
    }

    if (updates.specialties) ctx.config.specialties = updates.specialties;
    if (updates.pricing) ctx.config.pricing = updates.pricing;
    if (updates.autoQuote !== undefined) ctx.config.autoQuote = updates.autoQuote;
    if (updates.autoWork !== undefined) ctx.config.autoWork = updates.autoWork;
    if (updates.maxConcurrentTasks) ctx.config.maxConcurrentTasks = updates.maxConcurrentTasks;
    if (updates.declineKeywords) ctx.config.declineKeywords = updates.declineKeywords;
    if (updates.personality) ctx.config.personality = updates.personality;

    savePartialConfig(ctx.config);
    json(res, { ok: true });
  } catch {
    json(res, { error: "Invalid JSON" }, 400);
  }
}

function serveStatic(pathname: string, res: http.ServerResponse) {
  // Resolve the built UI dist directory.
  // In dev (tsx): import.meta.dirname = src/, built UI at ../dist/ui
  // In prod (dist/index.js): import.meta.dirname = dist/, built UI at ./ui
  const baseDir = import.meta.dirname ?? __dirname;
  const distUi = path.join(baseDir, "..", "dist", "ui");
  const uiDir = fs.existsSync(path.join(distUi, "index.html"))
    ? distUi
    : path.join(baseDir, "ui");
  let filePath = path.join(uiDir, pathname === "/" ? "index.html" : pathname);

  if (!path.extname(filePath)) {
    filePath = path.join(uiDir, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const ext = path.extname(filePath);
  const mimeTypes: Record<string, string> = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
  };

  res.writeHead(200, { "Content-Type": mimeTypes[ext] ?? "text/plain" });
  fs.createReadStream(filePath).pipe(res);
}

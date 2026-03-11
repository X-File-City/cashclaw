import type { ToolDefinition } from "../llm/types.js";
import type { WorkClawConfig } from "../config.js";
import type { Tool, ToolContext, ToolResult } from "./types.js";
import {
  readTask,
  quoteTask,
  declineTask,
  submitWork,
  sendMessage,
  listBounties,
  claimBounty,
} from "./marketplace.js";
import {
  checkWalletBalance,
  readFeedbackHistory,
  logActivity,
} from "./utility.js";
import { agentcashFetch, agentcashBalance } from "./agentcash.js";

const BASE_TOOLS: Tool[] = [
  readTask,
  quoteTask,
  declineTask,
  submitWork,
  sendMessage,
  listBounties,
  claimBounty,
  checkWalletBalance,
  readFeedbackHistory,
  logActivity,
];

const AGENTCASH_TOOLS: Tool[] = [
  agentcashFetch,
  agentcashBalance,
];

function buildToolMap(config: WorkClawConfig): Map<string, Tool> {
  const tools = config.agentCashEnabled
    ? [...BASE_TOOLS, ...AGENTCASH_TOOLS]
    : BASE_TOOLS;
  return new Map(tools.map((t) => [t.definition.name, t]));
}

export function getToolDefinitions(config: WorkClawConfig): ToolDefinition[] {
  const toolMap = buildToolMap(config);
  return [...toolMap.values()].map((t) => t.definition);
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const toolMap = buildToolMap(ctx.config);
  const tool = toolMap.get(name);
  if (!tool) {
    return { success: false, data: `Unknown tool: ${name}` };
  }

  try {
    return await tool.execute(input, ctx);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, data: `Tool error: ${msg}` };
  }
}

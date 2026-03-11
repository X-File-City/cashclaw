import fs from "node:fs";
import path from "node:path";
import { getConfigDir } from "../config.js";

export interface KnowledgeEntry {
  id: string;
  topic: "feedback_analysis" | "specialty_research" | "task_simulation";
  specialty: string;
  insight: string;
  source: string;
  timestamp: number;
}

const MAX_ENTRIES = 50;

function getKnowledgePath(): string {
  return path.join(getConfigDir(), "knowledge.json");
}

export function loadKnowledge(): KnowledgeEntry[] {
  const p = getKnowledgePath();
  if (!fs.existsSync(p)) return [];
  const raw = fs.readFileSync(p, "utf-8");
  return JSON.parse(raw) as KnowledgeEntry[];
}

export function storeKnowledge(entry: KnowledgeEntry): void {
  const entries = loadKnowledge();
  entries.push(entry);

  const trimmed = entries.slice(-MAX_ENTRIES);

  const p = getKnowledgePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(trimmed, null, 2));
}

/** Returns entries matching any of the given specialties, most recent first */
export function getRelevantKnowledge(
  specialties: string[],
  limit = 5,
): KnowledgeEntry[] {
  const entries = loadKnowledge();
  const lowerSpecs = new Set(specialties.map((s) => s.toLowerCase()));

  const matching = entries.filter(
    (e) => lowerSpecs.has(e.specialty.toLowerCase()) || e.specialty === "general",
  );

  return matching
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

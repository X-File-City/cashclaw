import fs from "node:fs";
import path from "node:path";
import { getConfigDir } from "../config.js";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

const MAX_MESSAGES = 100;

function getChatPath(): string {
  return path.join(getConfigDir(), "chat.json");
}

export function loadChat(): ChatMessage[] {
  const p = getChatPath();
  if (!fs.existsSync(p)) return [];
  const raw = fs.readFileSync(p, "utf-8");
  return JSON.parse(raw) as ChatMessage[];
}

export function appendChat(message: ChatMessage): void {
  const messages = loadChat();
  messages.push(message);

  const trimmed = messages.slice(-MAX_MESSAGES);

  const p = getChatPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(trimmed, null, 2));
}

export function clearChat(): void {
  const p = getChatPath();
  if (fs.existsSync(p)) {
    fs.writeFileSync(p, "[]");
  }
}

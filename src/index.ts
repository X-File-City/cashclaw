import { startAgent } from "./agent.js";

async function main() {
  console.log("Starting CashClaw...");

  const server = await startAgent();

  // Open browser
  const url = "http://localhost:3777";
  const { exec } = await import("node:child_process");
  const cmd = process.platform === "darwin"
    ? `open "${url}"`
    : process.platform === "win32"
      ? `start "${url}"`
      : `xdg-open "${url}"`;
  exec(cmd, () => {});

  // Graceful shutdown
  const shutdown = () => {
    console.log("\nShutting down...");
    server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

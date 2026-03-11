import { useState, useEffect } from "react";
import { api, type TaskData } from "../lib/api.js";
import { formatEther } from "viem";

const STATUS_STYLES: Record<string, string> = {
  requested: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  quoted: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  accepted: "text-green-400 bg-green-500/10 border-green-500/20",
  submitted: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  revision: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  completed: "text-green-400 bg-green-500/10 border-green-500/20",
  declined: "text-zinc-600 bg-zinc-500/5 border-zinc-500/10",
  cancelled: "text-zinc-600 bg-zinc-500/5 border-zinc-500/10",
};

export function Tasks() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [selected, setSelected] = useState<TaskData | null>(null);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const data = await api.getTasks();
        if (active) setTasks(data.tasks);
      } catch {
        // ignore
      }
    }

    void poll();
    const interval = setInterval(() => void poll(), 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-3 bg-red-500/20 rounded-[1px]" />
        <h2 className="text-[9px] font-mono font-bold text-zinc-600 tracking-[0.2em]">
          OPERATIONS
        </h2>
        <div className="flex-1 h-px bg-red-500/5" />
        <span className="text-[9px] font-mono text-zinc-800">
          {tasks.length} ACTIVE
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="panel text-center py-20">
          <div className="w-12 h-12 border border-red-500/10 rounded-sm flex items-center justify-center mx-auto mb-3">
            <div className="w-2 h-2 border border-zinc-800 rounded-sm" />
          </div>
          <p className="text-zinc-700 font-mono text-[10px] tracking-[0.2em]">NO ACTIVE OPS</p>
          <p className="text-zinc-800 text-[10px] mt-1.5 font-mono">Waiting for dispatch</p>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-red-500/[0.05]">
                {["ID", "TASK", "STATUS", "VALUE", "SCORE"].map((h, i) => (
                  <th
                    key={h}
                    className={`px-3 py-2 text-[8px] text-zinc-700 font-mono font-bold tracking-[0.2em] ${
                      i >= 3 ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-red-500/[0.03]">
              {tasks.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setSelected(selected?.id === t.id ? null : t)}
                  className={`cursor-pointer transition-colors ${
                    selected?.id === t.id ? "bg-red-500/[0.03]" : "hover:bg-red-500/[0.02]"
                  }`}
                >
                  <td className="px-3 py-2">
                    <code className="text-zinc-700 text-[10px] font-mono">{t.id.slice(0, 8)}</code>
                  </td>
                  <td className="px-3 py-2 max-w-md truncate text-zinc-400 text-[11px] font-mono">{t.task}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded-sm text-[9px] font-mono font-bold tracking-wider border ${STATUS_STYLES[t.status] ?? "text-zinc-600 bg-zinc-500/5 border-zinc-500/10"}`}
                    >
                      {t.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-600 text-[10px] readout">
                    {t.quotedPriceWei
                      ? `${formatEther(BigInt(t.quotedPriceWei))} ETH`
                      : "--"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-600 text-[10px]">
                    {t.ratedScore !== undefined ? `${t.ratedScore}/5` : "--"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div className="panel p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-mono text-[10px] text-zinc-500 tracking-wider">
              OP:<span className="text-zinc-400">{selected.id.slice(0, 12)}</span>
            </h3>
            <button
              onClick={() => setSelected(null)}
              className="text-[9px] font-mono text-zinc-700 hover:text-zinc-500 tracking-wider transition-colors"
            >
              CLOSE
            </button>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed">{selected.task}</p>
          {selected.result && (
            <div>
              <p className="text-[8px] text-zinc-700 font-mono font-bold tracking-[0.2em] mb-1.5">OUTPUT</p>
              <pre className="text-[10px] text-zinc-500 bg-zinc-950/80 p-3 rounded-sm overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap border border-red-500/[0.05] font-mono">
                {selected.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

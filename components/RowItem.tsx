"use client";
import type { Row } from "@/lib/types";
import { fmt, rs, status } from "@/lib/utils";
import { GET, GIVE, Icon, toneClass } from "./ui";

export default function RowItem({ x, onOpen }: { x: Row; onOpen: (id: string) => void }) {
  const g = x.type === "given";
  const s = status(x);
  return (
    <button onClick={() => onOpen(x.id)} className="flex w-full items-center gap-3 border-t border-slate-100 py-3 text-left first:border-0 dark:border-slate-800">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${g ? "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"}`}>
        <Icon d={g ? "M7 17L17 7M8 7h9v9" : "M17 7L7 17M16 17H7V8"} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{x.name}</span>
        <span className="block truncate text-sm text-slate-500 dark:text-slate-400">{x.title || x.event} · {fmt(x.date)}</span>
        {s.label !== "Saved" && <span className={`block text-xs font-semibold ${toneClass[s.tone]}`}>{s.label}</span>}
      </span>
      <span className={`shrink-0 whitespace-nowrap font-semibold ${g ? GIVE : GET}`}>{x.amount ? rs(x.amount) : "Gift"}</span>
    </button>
  );
}

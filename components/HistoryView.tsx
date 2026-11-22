"use client";
import { useMemo, useState, type ReactNode } from "react";
import type { Entry } from "@/lib/types";
import { fmt, rs, status } from "@/lib/utils";
import { C, Empty, GET, GIVE, seg, toneClass } from "./ui";

type Sort = "new" | "old" | "big";
const total = (e: Entry) => e.people.reduce((s, p) => s + p.amount, 0);
const SHOW = 6;

// One box for each event, with every person inside it.
export default function HistoryView({ entries, selected, onOpen, aside }: {
  entries: Entry[]; selected: string | null; onOpen: (id: string) => void; aside: ReactNode;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "given" | "received">("all");
  const [sort, setSort] = useState<Sort>("new");

  const list = useMemo(() => {
    const t = q.toLowerCase();
    const f = entries.filter((e) =>
      (filter === "all" || e.type === filter) &&
      `${e.title} ${e.event} ${e.people.map((p) => `${p.name} ${p.forWho ?? ""}`).join(" ")}`.toLowerCase().includes(t));
    return f.sort((a, b) => (sort === "old" ? a.date.localeCompare(b.date) : sort === "big" ? total(b) - total(a) : b.date.localeCompare(a.date)));
  }, [entries, q, filter, sort]);

  return (
    <>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or event" aria-label="Search" className={C.inp} />
      <div className="my-3 flex items-center gap-2">
        <div className="grid min-w-0 flex-1 grid-cols-3 gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800">
          {(["all", "given", "received"] as const).map((k) => (
            <button key={k} onClick={() => setFilter(k)} className={seg(filter === k, k === "given")}>{k[0].toUpperCase() + k.slice(1)}</button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort" className={`${C.inp} !w-auto shrink-0 !py-2 text-sm`}>
          <option value="new">Newest</option>
          <option value="old">Oldest</option>
          <option value="big">Largest</option>
        </select>
      </div>
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          {list.length === 0 && <div className={C.card}><Empty title="No entries found" text="Try a different search or filter." /></div>}
          {list.map((e, i) => {
            const g = e.type === "given";
            const s = status(e);
            const month = e.date.slice(0, 7);
            const newMonth = sort !== "big" && (i === 0 || list[i - 1].date.slice(0, 7) !== month);
            const t = total(e);
            const more = e.people.length - SHOW;
            return (
              <div key={e.id}>
                {newMonth && (
                  <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-slate-500 first:mt-0 dark:text-slate-400">
                    {new Date(e.date + "T00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                  </p>
                )}
                <button onClick={() => onOpen(e.id)}
                  className={`mb-3 block w-full overflow-hidden rounded-xl border-l-4 bg-white text-left shadow-sm ring-1 transition hover:shadow-md dark:bg-slate-900 ${g ? "border-rose-500" : "border-emerald-500"} ${selected === e.id ? "ring-2 ring-brand-500" : "ring-slate-200 dark:ring-slate-800"}`}>
                  <span className="flex items-start justify-between gap-3 px-4 py-3">
                    <span className="min-w-0">
                      <span className="block font-semibold">{e.title || e.event}</span>
                      <span className="block text-sm text-slate-500 dark:text-slate-400">{fmt(e.date)}{e.title ? ` · ${e.event}` : ""}</span>
                      <span className={`block text-xs font-semibold ${toneClass[s.tone]}`}>{s.label === "Saved" ? "✓ Saved" : s.label}</span>
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-right">
                      <span className={`block text-base font-bold ${g ? GIVE : GET}`}>{t ? rs(t) : "Gift"}</span>
                      <span className={`block text-xs font-semibold uppercase tracking-wider ${g ? GIVE : GET}`}>{g ? "Given" : "Received"}</span>
                    </span>
                  </span>
                  <span className="block border-t border-slate-100 bg-slate-50/70 px-4 py-2 dark:border-slate-800 dark:bg-slate-800/40">
                    {e.people.slice(0, SHOW).map((p, k) => (
                      <span key={k} className="flex items-baseline justify-between gap-3 py-1 text-sm">
                        <span className="min-w-0">{p.name}{p.forWho && <span className="text-slate-400"> · {p.forWho}</span>}</span>
                        <span className="shrink-0 whitespace-nowrap font-medium">{p.amount ? rs(p.amount) : "Gift"}</span>
                      </span>
                    ))}
                    {more > 0 && <span className="block py-1 text-xs text-slate-500">+ {more} more {more > 1 ? "people" : "person"}</span>}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
        <aside className="sticky top-4 hidden xl:block">{aside}</aside>
      </div>
    </>
  );
}

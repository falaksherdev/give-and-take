"use client";
import { useMemo, useState, type ReactNode } from "react";
import type { Row } from "@/lib/types";
import { fmt, rs, status } from "@/lib/utils";
import RowItem from "./RowItem";
import { C, Empty, GET, GIVE, seg, toneClass } from "./ui";

type SortKey = "date" | "name" | "amount";

export default function HistoryView({ rows, selected, onOpen, aside }: {
  rows: Row[]; selected: string | null; onOpen: (id: string) => void; aside: ReactNode;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "given" | "received">("all");
  const [sort, setSort] = useState<SortKey>("date");
  const [dir, setDir] = useState(-1);

  const list = useMemo(() => {
    const val = (x: Row) => (sort === "amount" ? x.amount : sort === "name" ? x.name.toLowerCase() : x.date);
    return rows
      .filter((x) => (filter === "all" || x.type === filter) && `${x.name} ${x.title}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => (val(a) < val(b) ? -dir : val(a) > val(b) ? dir : 0));
  }, [rows, q, filter, sort, dir]);

  const th = (k: SortKey, label: string) => (
    <th onClick={() => (sort === k ? setDir(-dir) : (setSort(k), setDir(k === "name" ? 1 : -1)))} className="cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
      {label}{sort === k ? (dir > 0 ? " ▲" : " ▼") : ""}
    </th>
  );
  const plain = (label: string) => <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</th>;
  const none = <Empty title="No entries found" text="Try a different search or filter." />;

  return (
    <>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or event" aria-label="Search" className={C.inp} />
      <div className="my-3 grid grid-cols-3 gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800">
        {(["all", "given", "received"] as const).map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={seg(filter === k, k === "given")}>{k[0].toUpperCase() + k.slice(1)}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <div className={`${C.card} lg:hidden`}>{list.length ? list.map((x) => <RowItem key={x.id + x.i} x={x} onOpen={onOpen} />) : none}</div>
          <div className={`${C.card} hidden overflow-x-auto lg:block`}>
            {list.length ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">{th("date", "Date")}{th("name", "Person")}{plain("Event")}{plain("Type")}{th("amount", "Amount")}{plain("Status")}</tr>
                </thead>
                <tbody>
                  {list.map((x) => {
                    const g = x.type === "given";
                    const s = status(x);
                    const sel = selected === x.id;
                    return (
                      <tr key={x.id + x.i} onClick={() => onOpen(x.id)} className={`cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60 ${sel ? "bg-slate-50 dark:bg-slate-800/60" : ""}`}>
                        <td className="whitespace-nowrap px-3 py-2.5">{fmt(x.date)}</td>
                        <td className="max-w-[11rem] truncate px-3 py-2.5 font-semibold" title={x.name}>{x.name}</td>
                        <td className="max-w-[11rem] truncate px-3 py-2.5" title={x.title || x.event}>{x.title || x.event}</td>
                        <td className={`whitespace-nowrap px-3 py-2.5 font-medium ${g ? GIVE : GET}`}>{g ? "Given" : "Received"}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-semibold">{x.amount ? rs(x.amount) : "Gift"}</td>
                        <td className={`whitespace-nowrap px-3 py-2.5 font-medium ${toneClass[s.tone]}`}>{s.label === "Saved" ? "✓ Saved" : s.label}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : none}
          </div>
        </div>
        <aside className="sticky top-4 hidden xl:block">{aside}</aside>
      </div>
    </>
  );
}

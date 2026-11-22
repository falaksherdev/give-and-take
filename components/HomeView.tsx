"use client";
import { useState } from "react";
import type { Row } from "@/lib/types";
import { fmt, lastTime, loans, rs, today, totals } from "@/lib/utils";
import RowItem from "./RowItem";
import { C, Empty, GET, GIVE, Icon, INFO } from "./ui";

const H2 = ({ children }: { children: string }) => (
  <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{children}</h2>
);

export default function HomeView({ rows, onOpen }: { rows: Row[]; onOpen: (id: string) => void }) {
  const [year, setYear] = useState(false);
  const t = totals(rows, year);
  const b = t.r - t.g;
  const L = loans(rows);
  const up = rows.filter((x) => x.date > today()).sort((a, c) => a.date.localeCompare(c.date));
  const recent = rows.filter((x) => x.date <= today()).slice(0, 5);
  const pill = (on: boolean, label: string, set: boolean) => (
    <button onClick={() => setYear(set)} className={`rounded-md px-3 py-1 text-xs font-semibold transition ${on ? "bg-white text-brand-900" : "text-white/70 hover:text-white"}`}>{label}</button>
  );
  const tile = (label: string, value: number, arrow: string, tone: string) => (
    <div className="rounded-xl bg-white/10 p-3">
      <p className={`flex items-center gap-1.5 text-xs font-medium ${tone}`}><Icon d={arrow} className="h-3.5 w-3.5" />{label}</p>
      <p className="mt-1 text-lg font-semibold">{rs(value)}</p>
    </div>
  );
  return (
    <>
      <section className="rounded-2xl bg-gradient-to-br from-brand-900 to-brand-700 p-6 text-white shadow-md">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Net balance</p>
          <div className="flex rounded-lg bg-white/10 p-0.5">{pill(year, "This year", true)}{pill(!year, "All time", false)}</div>
        </div>
        <p className="mt-2 text-4xl font-bold tracking-tight">{rs(Math.abs(b))}</p>
        <p className="mt-1 text-sm text-white/70">{b > 0 ? "You received more than you gave" : b < 0 ? "You gave more than you received" : "You are even"}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {tile("Given", t.g, "M7 17L17 7M8 7h9v9", "text-rose-200")}
          {tile("Received", t.r, "M17 7L7 17M16 17H7V8", "text-emerald-200")}
        </div>
      </section>
      {(L.lent > 0 || L.borrowed > 0) && (
        <section className={`${C.card} mt-4`}>
          <H2>Open loans</H2>
          <p className="text-sm">
            {L.lent > 0 && <>You lent <b className={GIVE}>{rs(L.lent)}</b>. </>}
            {L.borrowed > 0 && <>You borrowed <b className={GET}>{rs(L.borrowed)}</b>.</>}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Loans are not counted in your gift totals.</p>
        </section>
      )}
      {up.length > 0 && (
        <section className={`${C.card} mt-4`}>
          <H2>Upcoming</H2>
          {up.map((x) => (
            <button key={x.id + x.i} onClick={() => onOpen(x.id)} className="block w-full border-t border-slate-100 py-3 text-left first:border-0 dark:border-slate-800">
              <span className="flex justify-between gap-2"><b className="min-w-0">{x.name}</b><span className={`shrink-0 whitespace-nowrap text-sm font-semibold ${INFO}`}>{fmt(x.date)}</span></span>
              <span className="block text-sm text-slate-500 dark:text-slate-400">{x.title || x.event} · planned {x.amount ? rs(x.amount) : "gift"}</span>
              <span className="block text-sm">{lastTime(rows, x)}</span>
            </button>
          ))}
        </section>
      )}
      <section className={`${C.card} mt-4`}>
        <H2>Recent entries</H2>
        {recent.length ? recent.map((x) => <RowItem key={x.id + x.i} x={x} onOpen={onOpen} />) : <Empty title="No entries yet" text="Tap Add to create your first entry." />}
      </section>
    </>
  );
}

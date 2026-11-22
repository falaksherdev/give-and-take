"use client";
import { useMemo, useState } from "react";
import type { Row } from "@/lib/types";
import { buildPeople, eventTotals, fmt, GROUPS, rs } from "@/lib/utils";
import RowItem from "./RowItem";
import { C, Empty, GET, GIVE, LINK, Modal, seg, Spinner } from "./ui";

export default function PeopleView({ rows, groups, busy, onOpen, onGroup, onRename }: {
  rows: Row[];
  groups: Record<string, string>;
  busy: boolean;
  onOpen: (id: string) => void;
  onGroup: (key: string, group: string) => void;
  onRename: (from: string, to: string) => Promise<boolean>;
}) {
  const [tab, setTab] = useState<"people" | "events">("people");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [ren, setRen] = useState<string | null>(null);
  const people = useMemo(() => buildPeople(rows), [rows]);
  const events = useMemo(() => eventTotals(rows), [rows]);
  const p = sel ? people.find((x) => x.key === sel) : undefined;

  async function doRename() {
    if (!p || !ren?.trim()) return;
    if (await onRename(p.name, ren.trim())) { setSel(ren.trim().toLowerCase()); setRen(null); }
  }

  if (p) {
    const d = p.r - p.g;
    const grp = groups[p.key];
    return (
      <div className={C.card}>
        <button onClick={() => setSel(null)} className={`mb-3 text-sm font-semibold ${LINK}`}>← All people</button>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold tracking-tight">{p.name}</h2>
          <button onClick={() => setRen(p.name)} className={`text-sm font-semibold ${LINK}`}>Rename or merge</button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">You gave</p><p className={`font-semibold ${GIVE}`}>{rs(p.g)}</p></div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">You received</p><p className={`font-semibold ${GET}`}>{rs(p.r)}</p></div>
        </div>
        <div className="my-3 flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <button key={g} onClick={() => onGroup(p.key, grp === g ? "" : g)} className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-slate-300 dark:ring-slate-600 ${grp === g ? "bg-brand-700 text-white ring-0" : ""}`}>{g}</button>
          ))}
        </div>
        <div className="mb-3 rounded-lg bg-amber-100 p-3 text-sm text-amber-950 dark:bg-amber-950/60 dark:text-amber-100">
          {d > 0 ? `They gave you ${rs(d)} more. Give at least ${rs(d)} next time to be even.` : d < 0 ? `You gave ${rs(-d)} more. You are ahead.` : "You are even."}
        </div>
        {p.rows.map((x) => <RowItem key={x.id + x.i} x={x} onOpen={onOpen} />)}
        {ren !== null && (
          <Modal>
            <h3 className="text-lg font-bold">Rename or merge</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Type the new name. If a person with that name already exists, the two are merged into one.</p>
            <input autoFocus maxLength={60} value={ren} onChange={(e) => setRen(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") doRename(); }} aria-label="New name" className={`${C.inp} mt-3`} />
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={() => setRen(null)} disabled={busy} className={C.btn2}>Cancel</button>
              <button onClick={doRename} disabled={busy} className={C.btn}>{busy && <Spinner />}Save</button>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  const list = people.filter((x) => x.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800">
        <button onClick={() => setTab("people")} className={seg(tab === "people", false)}>People</button>
        <button onClick={() => setTab("events")} className={seg(tab === "events", false)}>Events</button>
      </div>
      {tab === "events" ? (
        <div className={C.card}>
          {events.length ? events.map((o) => (
            <div key={o.name} className="flex items-center justify-between gap-3 border-t border-slate-100 py-3 first:border-0 dark:border-slate-800">
              <div><p className="font-semibold">{o.name}</p><p className="text-sm text-slate-500 dark:text-slate-400">{fmt(o.date)} · {o.people.size} {o.people.size > 1 ? "people" : "person"}</p></div>
              <div className="text-right text-sm font-semibold">
                {o.r > 0 && <span className={`block ${GET}`}>Received {rs(o.r)}</span>}
                {o.g > 0 && <span className={`block ${GIVE}`}>Given {rs(o.g)}</span>}
              </div>
            </div>
          )) : <Empty title="No events yet" text="Add entries to see totals for each event." />}
        </div>
      ) : (
        <>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a person" aria-label="Search a person" className={C.inp} />
          <div className={`${C.card} mt-3`}>
            {list.length ? list.map((x) => {
              const d = x.r - x.g;
              const grp = groups[x.key];
              return (
                <button key={x.key} onClick={() => setSel(x.key)} className="flex w-full items-center justify-between gap-3 border-t border-slate-100 py-3 text-left first:border-0 dark:border-slate-800">
                  <span>
                    <span className="block font-semibold">{x.name}{grp && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{grp}</span>}</span>
                    <span className="block text-sm text-slate-500 dark:text-slate-400">Given {rs(x.g)} · Received {rs(x.r)}</span>
                  </span>
                  <span className={`text-right text-sm font-semibold ${d >= 0 ? GET : GIVE}`}>
                    {d === 0 ? "Even" : <>{rs(Math.abs(d))}<span className="block text-xs font-normal text-slate-500">{d > 0 ? "They gave more" : "You gave more"}</span></>}
                  </span>
                </button>
              );
            }) : <Empty title="No one found" text={people.length ? "Try a different name." : "People appear here after you add entries."} />}
          </div>
        </>
      )}
    </>
  );
}

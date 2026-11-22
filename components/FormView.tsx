"use client";
import { useMemo, useState } from "react";
import type { Entry, EntryInput, EntryType, Row } from "@/lib/types";
import { EVENTS, isGift, peopleStats, rs, today } from "@/lib/utils";
import { C, DatePicker, EventDropdown, GET, GIVE, LINK, NOTE, Spinner, seg } from "./ui";

type FormRow = { name: string; amount: string; forWho: string };

export default function FormView({ initial, rows, busy, onSave, onCancel, onError }: {
  initial: Entry | null;
  rows: Row[];
  busy: boolean;
  onSave: (input: EntryInput) => Promise<void>;
  onCancel: () => void;
  onError: (msg: string) => void;
}) {
  const [type, setType] = useState<EntryType>(initial?.type ?? "given");
  const [event, setEvent] = useState(initial?.event ?? EVENTS[0]);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? today());
  const [item, setItem] = useState(initial?.item ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [people, setPeople] = useState<FormRow[]>(
    initial ? initial.people.map((p) => ({ name: p.name, amount: p.amount ? String(p.amount) : "", forWho: p.forWho ?? "" })) : [{ name: "", amount: "", forWho: "" }],
  );
  const g = type === "given";

  // Custom events you used before stay in the list.
  const options = useMemo(() => {
    const extra = new Set<string>();
    rows.forEach((r) => { if (!EVENTS.includes(r.event)) extra.add(r.event); });
    if (!EVENTS.includes(event)) extra.add(event);
    return [...EVENTS, ...Array.from(extra)];
  }, [rows, event]);
  const stats = useMemo(() => peopleStats(rows), [rows]);

  const setRow = (i: number, k: keyof FormRow, v: string) => setPeople((p) => p.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  async function submit() {
    const list = people.filter((r) => r.name.trim()).map((r) => ({ name: r.name.trim(), amount: Number(r.amount) || 0, forWho: r.forWho.trim() }));
    if (!list.length) return onError("Please enter at least one name.");
    if (!list.some((p) => p.amount > 0) && !item.trim()) return onError("Please enter an amount or a gift item.");
    await onSave({ type, event, title: title.trim(), date, item: item.trim(), note: note.trim(), people: list });
  }

  return (
    <div className={`${C.card} lg:max-w-xl`}>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button onClick={() => setType("given")} className={seg(g, true)}>I gave</button>
        <button onClick={() => setType("received")} className={seg(!g, false)}>I received</button>
      </div>
      <label className={C.lbl}>Event type</label>
      <EventDropdown value={event} options={options} onChange={setEvent} />
      <label className={C.lbl} htmlFor="tt">Event name <span className="font-normal text-slate-500">(optional, such as “Ali’s wedding”)</span></label>
      <input id="tt" maxLength={40} value={title} onChange={(e) => setTitle(e.target.value)} className={C.inp} />
      <label className={C.lbl}>{g ? "Who did you give to?" : "Who gave to you?"} <span className="font-normal text-slate-500">(each person gets their own receipt)</span></label>
      {people.map((r, i) => (
        <div key={i} className="mb-3"><div className="flex gap-2">
          <input list="names" placeholder="Name" aria-label="Name" value={r.name} onChange={(e) => setRow(i, "name", e.target.value)} className={`${C.inp} flex-[2]`} />
          <input type="number" inputMode="numeric" min="0" placeholder="Amount or value" aria-label="Amount or value" value={r.amount} onChange={(e) => setRow(i, "amount", e.target.value)} className={`${C.inp} flex-[1.2]`} />
          {people.length > 1 && <button aria-label="Remove person" onClick={() => setPeople((p) => p.filter((_, j) => j !== i))} className="px-2 text-2xl text-slate-400 hover:text-rose-500">×</button>}
        </div>
        <input maxLength={40} placeholder="For (optional, such as groom or sarbala)" aria-label="For" value={r.forWho} onChange={(e) => setRow(i, "forWho", e.target.value)} className={`${C.inp} mt-2 !py-2 text-sm`} />
        </div>
      ))}
      <datalist id="names">{Array.from(stats.values()).map((p) => <option key={p.name} value={p.name} />)}</datalist>
      <button onClick={() => setPeople((p) => [...p, { name: "", amount: "", forWho: "" }])} className={`text-sm font-semibold ${LINK}`}>+ Add another person</button>
      {people.map((r, i) => {
        const s = stats.get(r.name.trim().toLowerCase());
        if (!s) return null;
        const d = s.r - s.g;
        return (
          <div key={"h" + i} className="mt-2 rounded-xl bg-amber-100 p-3 text-sm text-amber-950 dark:bg-amber-950/60 dark:text-amber-100">
            <b>{s.name}</b>: you gave {rs(s.g)} and received {rs(s.r)}.{g && d > 0 ? ` Suggested: give at least ${rs(d)}.` : ""}
          </div>
        );
      })}
      <label className={C.lbl} htmlFor="it">Gift item <span className="font-normal text-slate-500">(optional, such as gold. Put its value in the amount box)</span></label>
      <input id="it" maxLength={80} value={item} onChange={(e) => setItem(e.target.value)} className={C.inp} />
      <label className={C.lbl}>Date</label>
      <DatePicker value={date} onChange={setDate} />
      {date > today() && <div className={NOTE}>This date is in the future, so it is saved as an <b>upcoming</b> event and is not counted in your totals yet.</div>}
      {event === "Loan" && <div className={NOTE}>Loans are not counted as gifts. You can mark a loan as paid back later.</div>}
      <label className={C.lbl} htmlFor="nt">Note <span className="font-normal text-slate-500">(optional)</span></label>
      <input id="nt" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} className={C.inp} />
      <div className={`mt-6 grid gap-2 ${initial ? "grid-cols-2" : ""}`}>
        {initial && <button onClick={onCancel} className={C.btn2}>Cancel</button>}
        <button onClick={submit} disabled={busy} className={C.btn}>
          {busy && <Spinner />}{busy ? "Saving..." : initial ? "Update entry" : "Save entry"}
        </button>
      </div>
    </div>
  );
}

"use client";
import type { ReactNode } from "react";
import type { Entry } from "@/lib/types";
import { fmt, rs, slug } from "@/lib/utils";
import { C, GET, Spinner, WARN } from "./ui";

const Line = ({ a, b }: { a: ReactNode; b: ReactNode }) => (
  <div className="flex justify-between gap-4 py-1 text-sm">
    <span className="text-slate-600">{a}</span>
    <span className="text-right font-semibold">{b}</span>
  </div>
);
const Hr = () => <hr className="my-3 border-dashed border-slate-300" />;

// One receipt for the whole event, with every person listed.
export default function Receipt({ entry, onEdit, onDelete, onPaid, onSync, busy, syncing }: {
  entry: Entry; onEdit: () => void; onDelete: () => void; onPaid: () => void; onSync: () => void; busy: string; syncing: boolean;
}) {
  const g = entry.type === "given";
  const loan = entry.event === "Loan";
  const n = entry.people.length;
  const total = entry.people.reduce((s, p) => s + p.amount, 0);
  const file = `give-and-take_${entry.type}_${entry.date}_${slug(entry.title || entry.event)}.pdf`;
  return (
    <>
      <div className={`rounded-lg border-t-[6px] ${g ? "border-rose-600" : "border-emerald-600"} bg-white p-5 text-slate-900 shadow-md ring-1 ring-slate-200`}>
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold tracking-tight">Give and Take</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Receipt</p>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className={`rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${g ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{g ? "Given" : "Received"}</span>
          <span className="text-xs text-slate-500">No. {entry.id.slice(-6)}</span>
        </div>
        <Hr />
        <Line a="Event type" b={entry.event} />
        {entry.title && <Line a="Event name" b={entry.title} />}
        <Line a="Date" b={fmt(entry.date)} />
        <Hr />
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {g ? "Given to" : "Received from"} ({n} {n > 1 ? "people" : "person"})
        </p>
        {entry.people.map((p, k) => (
          <Line key={k} a={<>{p.name}{p.forWho && <span className="block text-xs text-slate-400">for {p.forWho}</span>}</>} b={p.amount ? rs(p.amount) : "Gift"} />
        ))}
        {entry.item && <Line a="Item" b={entry.item} />}
        {loan && <Line a="Loan status" b={entry.paid ? "Paid back" : "Not paid back yet"} />}
        {entry.note && <p className="mt-2 text-sm text-slate-500">Note: {entry.note}</p>}
        <Hr />
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-slate-600">Total</span>
          <span className="text-2xl font-bold">{total ? rs(total) : "Gift"}</span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <a href={`/api/entries/${entry.id}/pdf`} className={C.btn}>Save PDF</a>
        <button onClick={onSync} disabled={syncing} className={C.btn2}>
          {syncing && <Spinner />}{entry.sync === "synced" ? "Sync again" : "Save to Drive"}
        </button>
        {loan && (
          <button onClick={onPaid} disabled={!!busy} className={`${C.btn2} col-span-2`}>
            {busy === "paid" && <Spinner />}{entry.paid ? "Mark as not paid back" : "Mark as paid back"}
          </button>
        )}
        <button onClick={onEdit} className={C.btn2}>Edit</button>
        <button onClick={onDelete} className={C.btnR}>Delete</button>
      </div>
      {syncing ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Saving to Google Drive...</p>
      ) : entry.sync === "synced" ? (
        <p className={`mt-3 text-sm font-medium ${GET}`}>✓ Saved to Google Drive{entry.driveUrl && <> · <a href={entry.driveUrl} target="_blank" rel="noreferrer" className="underline">Open</a></>}</p>
      ) : entry.sync === "failed" ? (
        <p className={`mt-3 text-sm font-medium ${WARN}`}>Could not save to Drive: {entry.syncError || "unknown error"}</p>
      ) : (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Not on Google Drive yet.</p>
      )}
      <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">Drive folder: Give and Take / {g ? "Given" : "Received"} / {file}</p>
    </>
  );
}

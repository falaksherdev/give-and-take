"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, driveApi, peopleApi, type DriveStatus } from "@/lib/api";
import type { Entry, EntryInput } from "@/lib/types";
import { buildPeople, fmt, today, toRows } from "@/lib/utils";
import FormView from "./FormView";
import HistoryView from "./HistoryView";
import HomeView from "./HomeView";
import PeopleView from "./PeopleView";
import Receipt from "./Receipt";
import { C, Empty, Icon, LINK, Modal, Spinner, ToastList, type Toast, type ToastKind } from "./ui";

type View = "home" | "add" | "people" | "history" | "receipt" | "more";
const TITLES: Record<View, string> = { home: "Home", add: "New entry", people: "People", history: "History", receipt: "Receipt", more: "More" };
const NAV: [View, string, string][] = [
  ["home", "Home", "M3 11l9-8 9 8M5 10v10h14V10"],
  ["add", "Add", "M12 5v14M5 12h14"],
  ["people", "People", "M16 19v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1M10 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM20 19v-1a3 3 0 00-2.5-3M15.5 4.2a3.5 3.5 0 010 6.6"],
  ["history", "History", "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"],
  ["more", "More", "M5 12h.01M12 12h.01M19 12h.01"],
];

export default function App({ email, name, signOutAction }: { email: string; name: string; signOutAction: () => Promise<void> }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [trash, setTrash] = useState<Entry[]>([]);
  const [groups, setGroups] = useState<Record<string, string>>({});
  const [syncing, setSyncing] = useState<string[]>([]);
  const [drive, setDrive] = useState<DriveStatus | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [view, setView] = useState<View>("home");
  const [editing, setEditing] = useState<Entry | null>(null);
  const [rec, setRec] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const closeToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback((msg: string, kind: ToastKind = "success", undo?: () => void) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind, undo }]);
    setTimeout(() => closeToast(id), undo ? 5000 : 3200);
  }, [closeToast]);
  const fail = useCallback((e: unknown) => {
    if (e instanceof Error && e.message === "Not signed in") { window.location.href = "/"; return; }
    toast("Something went wrong. Please try again.", "error");
  }, [toast]);

  const load = useCallback(() => {
    setState("loading");
    Promise.all([api.list(), peopleApi.profile(), driveApi.status().catch(() => null)])
      .then(([d, p, s]) => { setEntries(d.entries); setTrash(d.trash); setGroups(p.groups); setDrive(s); setState("ready"); })
      .catch(() => setState("error"));
  }, []);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => toRows(entries), [entries]);
  const current = rec ? entries.find((e) => e.id === rec) ?? null : null;
  const waiting = entries.filter((e) => e.sync !== "synced" && e.date <= today()).length;

  function go(v: View) { setEditing(null); setView(v); window.scrollTo(0, 0); }
  function open(id: string) {
    setRec(id);
    if (!(view === "history" && window.matchMedia("(min-width:1024px)").matches)) { setView("receipt"); window.scrollTo(0, 0); }
  }

  async function save(input: EntryInput) {
    setBusy("save");
    try {
      const e = editing ? await api.update(editing.id, input) : await api.create(input);
      setEntries((l) => (editing ? l.map((x) => (x.id === e.id ? e : x)) : [...l, e]));
      toast(editing ? "Entry updated" : "Entry saved");
      setEditing(null); setRec(e.id); setView("receipt"); window.scrollTo(0, 0);
      if (e.date <= today()) void driveSync(e.id);
    } catch (err) { fail(err); } finally { setBusy(""); }
  }
  async function restore(id: string) {
    try {
      const e = await api.restore(id);
      setTrash((t) => t.filter((x) => x.id !== id));
      setEntries((l) => [...l, e]);
      toast("Entry restored");
      if (e.date <= today()) void driveSync(e.id, true);
    } catch (err) { fail(err); }
  }
  async function confirmDelete() {
    const e = entries.find((x) => x.id === confirmId);
    if (!e) return;
    setBusy("del");
    try {
      await api.remove(e.id);
      driveApi.sync(e.id, "trash").catch(() => toast("The entry is in Trash, but Google Drive was not updated.", "error"));
      setEntries((l) => l.filter((x) => x.id !== e.id));
      setTrash((t) => [{ ...e, deletedAt: new Date().toISOString() }, ...t]);
      setConfirmId(null); setRec(null); setView("history");
      toast("Entry moved to trash", "delete", () => restore(e.id));
    } catch (err) { fail(err); } finally { setBusy(""); }
  }
  async function togglePaid() {
    if (!current) return;
    setBusy("paid");
    try {
      const e = await api.setPaid(current.id, !current.paid);
      setEntries((l) => l.map((x) => (x.id === e.id ? e : x)));
      toast(e.paid ? "Loan marked as paid back" : "Loan marked as not paid back");
      if (e.date <= today()) void driveSync(e.id, true);
    } catch (err) { fail(err); } finally { setBusy(""); }
  }

  // Saves one entry's PDF and Sheet rows to Google Drive.
  async function driveSync(id: string, quiet = false): Promise<boolean> {
    setSyncing((s) => [...s, id]);
    try {
      const e = await driveApi.sync(id, "sync");
      setEntries((l) => l.map((x) => (x.id === e.id ? e : x)));
      if (e.sync === "synced") {
        if (!quiet) toast("Saved to Google Drive");
        if (!drive?.folderUrl) driveApi.status().then(setDrive).catch(() => undefined);
      } else if (!quiet) toast("Could not save to Drive. Open the receipt to see why.", "error");
      return e.sync === "synced";
    } catch (err) {
      fail(err);
      return false;
    } finally {
      setSyncing((s) => s.filter((x) => x !== id));
    }
  }
  async function syncAll() {
    const todo = entries.filter((e) => e.sync !== "synced" && e.date <= today());
    if (!todo.length) return;
    setBusy("syncall");
    let ok = 0;
    for (const e of todo) if (await driveSync(e.id, true)) ok++;
    setBusy("");
    toast(`${ok} of ${todo.length} saved to Google Drive`, ok === todo.length ? "success" : "error");
  }

  async function setGroup(key: string, group: string) {
    const before = groups;
    setGroups((g) => { const n = { ...g }; if (group) n[key] = group; else delete n[key]; return n; });
    try { await peopleApi.setGroup(key, group); toast("Group updated"); } catch (err) { setGroups(before); fail(err); }
  }
  async function rename(from: string, to: string): Promise<boolean> {
    setBusy("rename");
    try {
      const fk = from.trim().toLowerCase(), tk = to.trim().toLowerCase();
      const merged = fk !== tk && buildPeople(rows).some((p) => p.key === tk);
      await peopleApi.rename(from, to);
      const [d, p] = await Promise.all([api.list(), peopleApi.profile()]);
      setEntries(d.entries); setTrash(d.trash); setGroups(p.groups);
      toast(merged ? "People merged" : "Name updated");
      return true;
    } catch (err) { fail(err); return false; } finally { setBusy(""); }
  }

  const receipt = current ? (
    <Receipt entry={current} busy={busy} syncing={syncing.includes(current.id)} onSync={() => driveSync(current.id)}
      onEdit={() => { setEditing(current); setView("add"); window.scrollTo(0, 0); }} onDelete={() => setConfirmId(current.id)} onPaid={togglePaid} />
  ) : null;

  let body;
  if (state === "loading") body = <div className="animate-pulse space-y-4"><div className="h-40 rounded-3xl bg-slate-200 dark:bg-slate-800" /><div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" /></div>;
  else if (state === "error") body = (
    <div className={C.card}><Empty title="Could not load your entries" text="Check your internet and try again." />
      <button onClick={load} className={`${C.btn} mx-auto flex`}>Try again</button></div>
  );
  else if (view === "home") body = <HomeView rows={rows} onOpen={open} />;
  else if (view === "add") body = <FormView key={editing?.id ?? "new"} initial={editing} rows={rows} busy={busy === "save"} onSave={save} onError={(m) => toast(m, "error")} onCancel={() => { setEditing(null); setView("receipt"); }} />;
  else if (view === "history") body = <HistoryView rows={rows} selected={rec} onOpen={open}
    aside={receipt ?? <div className={`${C.card} text-center text-sm text-slate-500`}>Select a row to see its receipt</div>} />;
  else if (view === "receipt") body = receipt ? (
    <><button onClick={() => go("history")} className={`mb-3 text-sm font-semibold ${LINK}`}>← Back to history</button><div className="max-w-sm">{receipt}</div></>
  ) : <Empty title="No receipt selected" text="Open History and pick an entry." />;
  else if (view === "people") body = <PeopleView rows={rows} groups={groups} busy={busy === "rename"} onOpen={open} onGroup={setGroup} onRename={rename} />;
  else body = (
    <div className="space-y-4 lg:max-w-xl">
      <section className={C.card}>
        <h2 className="font-bold">Account</h2>
        <p className="mt-1 text-sm">{name}</p><p className="text-sm text-slate-500 dark:text-slate-400">{email}</p>
        <form action={signOutAction}><button className={`${C.btn2} mt-3 w-full`}>Sign out</button></form>
      </section>
      <section className={C.card}>
        <h2 className="font-bold">Google Drive</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {drive?.connected ? "Connected. Each receipt is saved in Give and Take / Given or Received, and every entry is added to a Google Sheet." : "Not connected yet. Sign out and sign in again, and allow Google Drive."}
        </p>
        <p className={`mt-2 text-sm font-medium ${waiting ? "text-amber-600 dark:text-amber-300" : "text-emerald-600 dark:text-emerald-400"}`}>
          {waiting ? `${waiting} ${waiting > 1 ? "entries are" : "entry is"} not on Drive yet.` : "Everything is saved to Drive."}
        </p>
        <button onClick={syncAll} disabled={!waiting || !drive?.connected || busy === "syncall"} className={`${C.btn} mt-3 w-full`}>
          {busy === "syncall" && <Spinner />}Save all to Drive
        </button>
        {(drive?.folderUrl || drive?.sheetUrl) && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {drive.folderUrl && <a href={drive.folderUrl} target="_blank" rel="noreferrer" className={C.btn2}>Open folder</a>}
            {drive.sheetUrl && <a href={drive.sheetUrl} target="_blank" rel="noreferrer" className={C.btn2}>Open Sheet</a>}
          </div>
        )}
      </section>
      <section className={C.card}>
        <h2 className="font-bold">Trash</h2>
        <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">Deleted entries stay here for 30 days.</p>
        {trash.length ? trash.map((x) => (
          <div key={x.id} className="flex items-center justify-between gap-3 border-t border-slate-100 py-3 dark:border-slate-800">
            <div className="min-w-0"><p className="truncate font-semibold">{x.people.map((p) => p.name).join(", ")}</p><p className="text-sm text-slate-500 dark:text-slate-400">{x.title || x.event} · {fmt(x.date)}</p></div>
            <button onClick={() => restore(x.id)} className={`${C.btn2} !px-3 !py-2 text-sm`}>Restore</button>
          </div>
        )) : <Empty title="Trash is empty" text="Nothing to restore." />}
      </section>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f6f9] font-sans tabular-nums text-slate-900 dark:bg-[#0b1220] dark:text-slate-100">
      <ToastList toasts={toasts} onClose={closeToast} />
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:inset-y-0 lg:right-auto lg:w-60 lg:flex-col lg:justify-start lg:gap-1 lg:border-r lg:border-t-0 lg:p-4">
        <div className="mb-5 hidden items-center gap-3 px-4 pt-2 lg:flex"><span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-800 text-sm font-bold text-white">G</span><span className="text-lg font-bold tracking-tight">Give and Take</span></div>
        {NAV.map(([v, label, d]) => {
          const on = v === (view === "receipt" ? "history" : view);
          return (
            <button key={v} onClick={() => go(v)} aria-current={on ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs font-semibold lg:flex-none lg:flex-row lg:gap-3 lg:rounded-xl lg:px-4 lg:py-3 lg:text-base ${on ? "text-brand-700 dark:text-brand-300 lg:bg-brand-50 lg:dark:bg-brand-900/40" : "text-slate-500 dark:text-slate-400"}`}>
              <Icon d={d} className="h-6 w-6" />{label}
            </button>
          );
        })}
      </nav>
      <div className="lg:pl-60">
        <div className="mx-auto max-w-md px-4 pb-28 pt-4 lg:max-w-5xl lg:pb-10">
          <div className="mb-5"><h1 className="text-2xl font-bold tracking-tight">{view === "add" && editing ? "Edit entry" : TITLES[view]}</h1>{view === "home" && <p className="text-sm text-slate-500 dark:text-slate-400">Welcome back, {name.split(" ")[0] || "there"}</p>}</div>
          {body}
        </div>
      </div>
      {confirmId && (
        <Modal>
          <h3 className="text-lg font-bold">Delete this entry?</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">It moves to Trash for 30 days. You can restore it from the More screen.</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button onClick={() => setConfirmId(null)} disabled={busy === "del"} className={C.btn2}>Cancel</button>
            <button onClick={confirmDelete} disabled={busy === "del"} className={C.btnR}>{busy === "del" && <Spinner />}Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

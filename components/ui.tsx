"use client";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { fmt, today, type Tone } from "@/lib/utils";

export const GIVE = "text-rose-600 dark:text-rose-400";
export const GET = "text-emerald-600 dark:text-emerald-400";
export const WARN = "text-amber-600 dark:text-amber-300";
export const INFO = "text-sky-600 dark:text-sky-300";
export const LINK = "text-brand-700 dark:text-brand-300";
export const HOV = "hover:bg-slate-100 dark:hover:bg-slate-800";
export const NOTE = "mt-3 rounded-xl p-3 text-sm bg-sky-100 text-sky-950 dark:bg-sky-950/60 dark:text-sky-100";
export const toneClass: Record<Tone, string> = { ok: GET, warn: WARN, info: INFO };

export const C = {
  card: "rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800",
  inp: "w-full rounded-lg bg-white px-3.5 py-2.5 text-base outline-none ring-1 ring-slate-300 transition focus:ring-2 focus:ring-brand-500 dark:bg-slate-800 dark:ring-slate-700",
  btn: "inline-flex items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-600 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60",
  btn2: "inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 font-semibold ring-1 ring-slate-300 transition hover:bg-slate-50 active:scale-[.98] disabled:opacity-60 dark:bg-slate-800 dark:ring-slate-600 dark:hover:bg-slate-700",
  btnR: "inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 font-semibold text-white transition hover:bg-rose-500 active:scale-[.98] disabled:opacity-60",
  lbl: "mb-1.5 mt-4 block text-sm font-semibold text-slate-700 dark:text-slate-200",
};
export const seg = (on: boolean, give: boolean) =>
  `rounded-md py-2 text-sm font-semibold transition ${on ? "bg-white shadow-sm dark:bg-slate-950 " + (give ? GIVE : GET) : "text-slate-500 dark:text-slate-400"}`;

export function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
export function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4z" />
    </svg>
  );
}
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="py-8 text-center">
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}
export function Modal({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/60 p-4">
      <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900">
        {children}
      </div>
    </div>
  );
}

export type ToastKind = "success" | "error" | "delete" | "info";
export type Toast = { id: number; msg: string; kind: ToastKind; undo?: () => void };
const TK: Record<ToastKind, [string, string]> = {
  success: ["bg-emerald-600", "M5 13l4 4L19 7"],
  error: ["bg-amber-600", "M12 8v5M12 16h.01"],
  delete: ["bg-rose-600", "M5 7h14M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3"],
  info: ["bg-slate-600", "M12 8h.01M12 12v4"],
};
export function ToastList({ toasts, onClose }: { toasts: Toast[]; onClose: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div key={t.id} role="status" className="pointer-events-auto flex items-center gap-3 rounded-xl bg-white py-2 pl-2 pr-4 text-sm font-medium shadow-lg ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${TK[t.kind][0]} text-white`}>
            <Icon d={TK[t.kind][1]} className="h-4 w-4" />
          </span>
          <span>{t.msg}</span>
          {t.undo && (
            <button className={`ml-1 font-bold ${LINK}`} onClick={() => { t.undo?.(); onClose(t.id); }}>
              Undo
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function useOutside(ref: RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  });
}

export function EventDropdown({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => { setOpen(false); setAdding(false); });
  function add() {
    const n = name.trim();
    if (!n) return setErr("Please type an event name.");
    if (options.some((o) => o.toLowerCase() === n.toLowerCase())) return setErr("That event already exists.");
    onChange(n); setOpen(false); setAdding(false); setName(""); setErr("");
  }
  return (
    <div className="relative" ref={ref}>
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)} className={`${C.inp} flex items-center justify-between text-left`}>
        <span>{value}</span>
        <Icon d="M6 9l6 6 6-6" className={`h-5 w-5 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="listbox" className="absolute z-20 mt-2 max-h-80 w-full overflow-auto rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          {options.map((x) => (
            <button key={x} type="button" role="option" aria-selected={x === value} onClick={() => { onChange(x); setOpen(false); }} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left ${HOV} ${x === value ? "font-bold " + GET : ""}`}>
              {x}
              {x === value && <Icon d="M5 13l4 4L19 7" className="h-4 w-4" />}
            </button>
          ))}
          <div className="mt-1 border-t border-slate-100 pt-2 dark:border-slate-800">
            {adding ? (
              <>
                <div className="flex gap-2">
                  <input autoFocus maxLength={30} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder="Event name" aria-label="New event name" className={`${C.inp} !py-2`} />
                  <button type="button" onClick={add} className={`${C.btn} !px-4 !py-2`}>Add</button>
                </div>
                {err && <p className="mt-1 text-sm text-rose-600">{err}</p>}
              </>
            ) : (
              <button type="button" onClick={() => setAdding(true)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left font-semibold ${LINK} ${HOV}`}>
                <Icon d="M12 5v14M5 12h14" className="h-4 w-4" />Add custom event
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const p2 = (x: number) => String(x).padStart(2, "0");
export function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ y: +value.slice(0, 4), m: +value.slice(5, 7) - 1 });
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false));
  const { y, m } = view;
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const move = (dy: number, dm: number) => {
    const d = new Date(y + dy, m + dm, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const nb = (label: string, aria: string, dy: number, dm: number) => (
    <button type="button" aria-label={aria} onClick={() => move(dy, dm)} className={`grid h-9 w-9 place-items-center rounded-lg ${HOV}`}>{label}</button>
  );
  const t = today();
  return (
    <div className="relative" ref={ref}>
      <button
        type="button" aria-expanded={open}
        onClick={() => { setView({ y: +value.slice(0, 4), m: +value.slice(5, 7) - 1 }); setOpen(!open); }}
        className={`${C.inp} flex items-center justify-between text-left`}
      >
        <span>{fmt(value)}</span>
        <Icon d="M8 3v3M16 3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" className="h-5 w-5 text-slate-400" />
      </button>
      {open && (
        <div className="absolute z-20 mt-2 w-full max-w-xs rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          <div className="mb-2 flex items-center justify-between">
            {nb("«", "Previous year", -1, 0)}{nb("‹", "Previous month", 0, -1)}
            <span className="flex-1 text-center text-sm font-bold">{new Date(y, m, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
            {nb("›", "Next month", 0, 1)}{nb("»", "Next year", 1, 0)}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => <span key={d} className="py-1">{d}</span>)}
            {Array.from({ length: lead }, (_, i) => <span key={"s" + i} />)}
            {Array.from({ length: days }, (_, i) => {
              const iso = `${y}-${p2(m + 1)}-${p2(i + 1)}`;
              return (
                <button key={iso} type="button" onClick={() => { onChange(iso); setOpen(false); }} className={`h-9 rounded-lg text-sm font-medium ${iso === value ? "bg-brand-700 text-white" : (iso === t ? "ring-1 ring-brand-500 " : "") + HOV}`}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => { onChange(t); setOpen(false); }} className={`mt-2 w-full rounded-lg py-2 text-sm font-semibold ${GET} ${HOV}`}>Today</button>
        </div>
      )}
    </div>
  );
}

import type { Entry, Row } from "./types";

export const EVENTS = ["Wedding", "Engagement", "Birthday", "Baby ceremony", "Eid gift", "Funeral", "New home or baby", "Help", "Loan"];

export const rs = (n: number) => "Rs " + Number(n).toLocaleString("en-PK");
export const fmt = (d: string) =>
  new Date(d + "T00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function toRows(entries: Entry[]): Row[] {
  return entries
    .flatMap((e) =>
      e.people.map((p, i) => ({
        id: e.id, i, type: e.type, event: e.event, title: e.title, date: e.date,
        paid: e.paid, sync: e.sync, item: e.item, note: e.note, name: p.name, amount: p.amount,
      })),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}

// A "gift" is not a loan and has already happened.
export const isGift = (x: Row) => x.event !== "Loan" && x.date <= today();

export function totals(rows: Row[], thisYearOnly: boolean) {
  const year = String(new Date().getFullYear());
  return rows
    .filter((x) => isGift(x) && (!thisYearOnly || x.date.startsWith(year)))
    .reduce((o, x) => (x.type === "given" ? { ...o, g: o.g + x.amount } : { ...o, r: o.r + x.amount }), { g: 0, r: 0 });
}

export function loans(rows: Row[]) {
  return rows
    .filter((x) => x.event === "Loan" && !x.paid && x.date <= today())
    .reduce((o, x) => (x.type === "given" ? { ...o, lent: o.lent + x.amount } : { ...o, borrowed: o.borrowed + x.amount }), { lent: 0, borrowed: 0 });
}

export function peopleStats(rows: Row[]) {
  const m = new Map<string, { name: string; g: number; r: number }>();
  rows.filter(isGift).forEach((x) => {
    const k = x.name.trim().toLowerCase();
    const p = m.get(k) ?? { name: x.name, g: 0, r: 0 };
    if (x.type === "given") p.g += x.amount;
    else p.r += x.amount;
    m.set(k, p);
  });
  return m;
}

export function lastTime(rows: Row[], x: Row) {
  const y = rows.find((z) => z.name.toLowerCase() === x.name.toLowerCase() && isGift(z));
  return y
    ? `Last time: you ${y.type === "given" ? "gave" : "received"} ${rs(y.amount)} (${y.title || y.event}, ${fmt(y.date)})`
    : "No earlier entries with this person";
}

export type Tone = "ok" | "warn" | "info";
export function status(x: Row): { label: string; tone: Tone } {
  if (x.date > today()) return { label: "Upcoming", tone: "info" };
  if (x.sync === "failed") return { label: "Drive failed", tone: "warn" };
  if (x.sync === "pending") return { label: "Not on Drive yet", tone: "warn" };
  if (x.event === "Loan") return x.paid ? { label: "Paid back", tone: "ok" } : { label: "Open loan", tone: "warn" };
  return { label: "Saved", tone: "ok" };
}

export const GROUPS = ["Family", "Friend", "Neighbour", "Work"];

export type PersonSummary = { key: string; name: string; g: number; r: number; rows: Row[] };
export function buildPeople(rows: Row[]): PersonSummary[] {
  const m = new Map<string, PersonSummary>();
  rows.filter(isGift).forEach((x) => {
    const k = x.name.trim().toLowerCase();
    const p = m.get(k) ?? { key: k, name: x.name, g: 0, r: 0, rows: [] };
    if (x.type === "given") p.g += x.amount;
    else p.r += x.amount;
    p.rows.push(x);
    m.set(k, p);
  });
  return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function eventTotals(rows: Row[]) {
  const m = new Map<string, { name: string; date: string; g: number; r: number; people: Set<string> }>();
  rows.filter(isGift).forEach((x) => {
    const k = x.title || x.event;
    const o = m.get(k) ?? { name: k, date: x.date, g: 0, r: 0, people: new Set<string>() };
    if (x.type === "given") o.g += x.amount;
    else o.r += x.amount;
    o.people.add(x.name.trim().toLowerCase());
    if (x.date > o.date) o.date = x.date;
    m.set(k, o);
  });
  return Array.from(m.values()).sort((a, b) => b.date.localeCompare(a.date));
}

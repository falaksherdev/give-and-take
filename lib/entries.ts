import { ObjectId, type Document, type WithId } from "mongodb";
import type { Entry, EntryInput } from "./types";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Checks and cleans what the browser sends. Returns null if it is not valid.
export function parseInput(body: unknown): EntryInput | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (o.type !== "given" && o.type !== "received") return null;
  const date = str(o.date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const event = str(o.event, 30);
  if (!event || !Array.isArray(o.people)) return null;
  const people = o.people
    .slice(0, 50)
    .map((p) => {
      const q = (p ?? {}) as Record<string, unknown>;
      const amount = Number(q.amount);
      return { name: str(q.name, 60), forWho: str(q.forWho, 40), amount: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0 };
    })
    .filter((p) => p.name);
  const item = str(o.item, 80);
  if (!people.length || (!item && !people.some((p) => p.amount > 0))) return null;
  return { type: o.type, event, title: str(o.title, 40), date, item, note: str(o.note, 200), people };
}

export function toEntry(d: WithId<Document>): Entry {
  return {
    id: d._id.toString(),
    type: d.type,
    event: d.event,
    title: d.title ?? "",
    date: d.date,
    item: d.item ?? "",
    note: d.note ?? "",
    people: d.people,
    paid: !!d.paid,
    deletedAt: d.deletedAt ? new Date(d.deletedAt).toISOString() : null,
    sync: d.sync === "synced" || d.sync === "failed" ? d.sync : "pending",
    driveUrl: d.driveUrl ?? "",
    syncError: d.syncError ?? "",
  };
}

export const isId = (id: string) => ObjectId.isValid(id);

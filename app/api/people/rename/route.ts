import type { AnyBulkWriteOperation, Document } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { badRequest, requireEmail, unauthorized } from "@/lib/session";
import type { Person } from "@/lib/types";

// Renames a person in every entry. If the new name already exists, the two people become one.
export async function POST(req: Request) {
  const email = await requireEmail();
  if (!email) return unauthorized();
  const b = (await req.json().catch(() => null)) as { from?: unknown; to?: unknown } | null;
  const from = typeof b?.from === "string" ? b.from.trim().toLowerCase().slice(0, 60) : "";
  const to = typeof b?.to === "string" ? b.to.trim().slice(0, 60) : "";
  if (!from || !to) return badRequest();

  const db = await getDb();
  const entries = db.collection("entries");
  const ops: AnyBulkWriteOperation<Document>[] = [];
  for (const d of await entries.find({ userEmail: email }).toArray()) {
    const people = d.people as Person[];
    if (!people.some((p) => p.name.trim().toLowerCase() === from)) continue;
    ops.push({
      updateOne: {
        filter: { _id: d._id },
        update: { $set: { people: people.map((p) => (p.name.trim().toLowerCase() === from ? { ...p, name: to } : p)), sync: "pending", updatedAt: new Date() } },
      },
    });
  }
  if (ops.length) await entries.bulkWrite(ops);

  // Keep the person's group.
  const profiles = db.collection<{ userEmail: string; groups: { key: string; group: string }[] }>("profiles");
  const list = (await profiles.findOne({ userEmail: email }))?.groups ?? [];
  const old = list.find((g) => g.key === from);
  const toKey = to.toLowerCase();
  if (old && toKey !== from) {
    await profiles.updateOne({ userEmail: email }, { $pull: { groups: { key: from } } });
    if (!list.some((g) => g.key === toKey)) await profiles.updateOne({ userEmail: email }, { $push: { groups: { key: toKey, group: old.group } } });
  }
  return Response.json({ changed: ops.length });
}

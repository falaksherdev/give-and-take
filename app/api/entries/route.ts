import { getDb } from "@/lib/mongodb";
import { badRequest, requireEmail, unauthorized } from "@/lib/session";
import { parseInput, toEntry } from "@/lib/entries";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export async function GET() {
  const email = await requireEmail();
  if (!email) return unauthorized();
  const col = (await getDb()).collection("entries");
  // Trash is emptied after 30 days.
  await col.deleteMany({ userEmail: email, deletedAt: { $lt: new Date(Date.now() - THIRTY_DAYS) } });
  const all = (await col.find({ userEmail: email }).sort({ date: -1 }).toArray()).map(toEntry);
  return Response.json({ entries: all.filter((e) => !e.deletedAt), trash: all.filter((e) => e.deletedAt) });
}

export async function POST(req: Request) {
  const email = await requireEmail();
  if (!email) return unauthorized();
  const input = parseInput(await req.json().catch(() => null));
  if (!input) return badRequest();
  const col = (await getDb()).collection("entries");
  const now = new Date();
  const r = await col.insertOne({ ...input, userEmail: email, paid: false, deletedAt: null, sync: "pending", syncError: "", createdAt: now, updatedAt: now });
  const doc = await col.findOne({ _id: r.insertedId });
  if (!doc) return Response.json({ error: "Not saved" }, { status: 500 });
  return Response.json(toEntry(doc), { status: 201 });
}

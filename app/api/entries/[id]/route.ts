import { ObjectId, type Document } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { badRequest, requireEmail, unauthorized } from "@/lib/session";
import { isId, parseInput, toEntry } from "@/lib/entries";

type Ctx = { params: Promise<{ id: string }> };

// Update an entry, or just change its "paid back" flag (for loans).
export async function PUT(req: Request, { params }: Ctx) {
  const email = await requireEmail();
  if (!email) return unauthorized();
  const { id } = await params;
  if (!isId(id)) return badRequest();
  const body = await req.json().catch(() => null);
  let update: Document | null = null;
  if (body && typeof body === "object" && Object.keys(body).length === 1 && typeof (body as { paid?: unknown }).paid === "boolean") {
    update = { paid: (body as { paid: boolean }).paid };
  } else {
    update = parseInput(body);
  }
  if (!update) return badRequest();
  const col = (await getDb()).collection("entries");
  const doc = await col.findOneAndUpdate(
    { _id: new ObjectId(id), userEmail: email, deletedAt: null },
    { $set: { ...update, sync: "pending", syncError: "", updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(toEntry(doc));
}

// "Delete" moves the entry to the trash.
export async function DELETE(_req: Request, { params }: Ctx) {
  const email = await requireEmail();
  if (!email) return unauthorized();
  const { id } = await params;
  if (!isId(id)) return badRequest();
  const col = (await getDb()).collection("entries");
  const r = await col.updateOne({ _id: new ObjectId(id), userEmail: email, deletedAt: null }, { $set: { deletedAt: new Date() } });
  if (!r.matchedCount) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}

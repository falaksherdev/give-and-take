import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { badRequest, requireEmail, unauthorized } from "@/lib/session";
import { isId, toEntry } from "@/lib/entries";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const email = await requireEmail();
  if (!email) return unauthorized();
  const { id } = await params;
  if (!isId(id)) return badRequest();
  const col = (await getDb()).collection("entries");
  const doc = await col.findOneAndUpdate(
    { _id: new ObjectId(id), userEmail: email, deletedAt: { $ne: null } },
    { $set: { deletedAt: null, sync: "pending", syncError: "" } },
    { returnDocument: "after" },
  );
  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(toEntry(doc));
}

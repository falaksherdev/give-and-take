import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { badRequest, requireEmail, unauthorized } from "@/lib/session";
import { isId, toEntry } from "@/lib/entries";
import { buildReceipt } from "@/lib/pdf";
import { syncEntry, trashEntry } from "@/lib/drive";

// Saves this entry to Google Drive and the Google Sheet (or removes it, for deleted entries).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const email = await requireEmail();
  if (!email) return unauthorized();
  const { id } = await params;
  if (!isId(id)) return badRequest();
  const body = (await req.json().catch(() => null)) as { action?: unknown } | null;
  const col = (await getDb()).collection("entries");
  const _id = new ObjectId(id);
  const doc = await col.findOne({ _id, userEmail: email });
  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });
  const fileId = typeof doc.driveFileId === "string" ? doc.driveFileId : undefined;

  if (body?.action === "trash") {
    try {
      await trashEntry(email, id, fileId);
      return Response.json(toEntry(doc));
    } catch (e) {
      return Response.json({ error: e instanceof Error ? e.message : "Drive error" }, { status: 502 });
    }
  }

  if (doc.deletedAt) return badRequest();
  try {
    const entry = toEntry(doc);
    const r = await syncEntry(email, entry, await buildReceipt(entry), fileId);
    await col.updateOne({ _id }, { $set: { driveFileId: r.fileId, driveUrl: r.url, sync: "synced", syncError: "", syncedAt: new Date() } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    await col.updateOne({ _id }, { $set: { sync: "failed", syncError: message.slice(0, 200) } });
  }
  const fresh = await col.findOne({ _id });
  return Response.json(toEntry(fresh ?? doc));
}

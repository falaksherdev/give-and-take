import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { badRequest, requireEmail, unauthorized } from "@/lib/session";
import { isId, toEntry } from "@/lib/entries";
import { buildReceipt, receiptName } from "@/lib/pdf";

// Downloads the receipt PDF for this entry.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const email = await requireEmail();
  if (!email) return unauthorized();
  const { id } = await params;
  if (!isId(id)) return badRequest();
  const doc = await (await getDb()).collection("entries").findOne({ _id: new ObjectId(id), userEmail: email });
  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });
  const entry = toEntry(doc);
  const pdf = await buildReceipt(entry);
  return new Response(new Blob([new Uint8Array(pdf)], { type: "application/pdf" }), {
    headers: { "Content-Disposition": `attachment; filename="${receiptName(entry)}"` },
  });
}

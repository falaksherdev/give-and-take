import { getDb } from "@/lib/mongodb";
import { badRequest, requireEmail, unauthorized } from "@/lib/session";
import { toEntry } from "@/lib/entries";
import { buildStatement, type StatementRow } from "@/lib/pdf";
import { slug } from "@/lib/utils";

// Downloads a statement PDF for one person. It is made when you ask and is not saved anywhere.
export async function GET(req: Request) {
  const email = await requireEmail();
  if (!email) return unauthorized();
  const name = new URL(req.url).searchParams.get("name")?.trim().toLowerCase().slice(0, 60);
  if (!name) return badRequest();
  const docs = await (await getDb()).collection("entries").find({ userEmail: email, deletedAt: null }).toArray();
  const rows: StatementRow[] = [];
  let shown = "";
  for (const e of docs.map(toEntry)) {
    for (const p of e.people) {
      if (p.name.trim().toLowerCase() !== name) continue;
      shown ||= p.name;
      rows.push({ date: e.date, event: e.event, title: e.title, type: e.type, amount: p.amount, forWho: p.forWho ?? "", paid: e.paid });
    }
  }
  if (!rows.length) return Response.json({ error: "Not found" }, { status: 404 });
  const pdf = await buildStatement(shown, rows);
  return new Response(new Blob([new Uint8Array(pdf)], { type: "application/pdf" }), {
    headers: { "Content-Disposition": `attachment; filename="statement_${slug(shown) || "person"}.pdf"` },
  });
}

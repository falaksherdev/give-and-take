import { getDb } from "@/lib/mongodb";
import { badRequest, requireEmail, unauthorized } from "@/lib/session";

const GROUPS = ["Family", "Friend", "Neighbour", "Work"];
type G = { key: string; group: string };
type Profile = { userEmail: string; groups: G[] };

export async function GET() {
  const email = await requireEmail();
  if (!email) return unauthorized();
  const doc = await (await getDb()).collection<Profile>("profiles").findOne({ userEmail: email });
  const list = doc?.groups ?? [];
  return Response.json({ groups: Object.fromEntries(list.map((g) => [g.key, g.group])) });
}

// Set (or clear, with an empty group) the group of one person.
export async function PUT(req: Request) {
  const email = await requireEmail();
  if (!email) return unauthorized();
  const b = (await req.json().catch(() => null)) as { key?: unknown; group?: unknown } | null;
  const key = typeof b?.key === "string" ? b.key.trim().toLowerCase().slice(0, 60) : "";
  const group = typeof b?.group === "string" ? b.group : "";
  if (!key || (group && !GROUPS.includes(group))) return badRequest();
  const col = (await getDb()).collection<Profile>("profiles");
  await col.updateOne({ userEmail: email }, { $pull: { groups: { key } } }, { upsert: true });
  if (group) await col.updateOne({ userEmail: email }, { $push: { groups: { key, group } } });
  return Response.json({ ok: true });
}

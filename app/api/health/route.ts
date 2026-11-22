import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  const session = await auth();
  if (!session) {
    return Response.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    const ping = await db.collection<{ _id: string; lastPing?: Date }>("keepalive").findOne({ _id: "ping" });
    return Response.json({
      ok: true,
      email: session.user?.email,
      database: "connected",
      lastPing: ping?.lastPing ? new Date(ping.lastPing).toISOString() : null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

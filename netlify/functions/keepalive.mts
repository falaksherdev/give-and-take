import { MongoClient } from "mongodb";

// Runs once a day (UTC) after the site is live on Netlify.
// 1. Writes one small record to MongoDB, so the free cluster never counts as inactive.
// 2. Refreshes the Google login, so the Drive connection never goes unused for months.
export default async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("keepalive: MONGODB_URI is missing");
    return;
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("giveandtake");

    await db
      .collection<{ _id: string; lastPing: Date; runs: number }>("keepalive")
      .updateOne({ _id: "ping" }, { $set: { lastPing: new Date() }, $inc: { runs: 1 } }, { upsert: true });

    const tokens = db.collection<{ userEmail: string; refreshToken?: string }>("google_tokens");
    for (const t of await tokens.find({ refreshToken: { $exists: true } }).toArray()) {
      if (!t.refreshToken) continue;
      const r = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.AUTH_GOOGLE_ID ?? "",
          client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
          refresh_token: t.refreshToken,
          grant_type: "refresh_token",
        }),
      });
      if (r.ok) {
        const j = (await r.json()) as { access_token: string; expires_in: number };
        await tokens.updateOne({ _id: t._id }, { $set: { accessToken: j.access_token, expiresAt: Date.now() + j.expires_in * 1000 } });
      } else {
        console.error("keepalive: Google refresh failed with status", r.status);
      }
    }
    console.log("keepalive: done");
  } catch (e) {
    console.error("keepalive failed", e);
  } finally {
    await client.close();
  }
};

export const config = { schedule: "@daily" };

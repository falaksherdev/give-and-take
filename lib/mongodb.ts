import { MongoClient } from "mongodb";

// One shared connection (created the first time it is needed).
const g = globalThis as unknown as { _mongo?: Promise<MongoClient> };

export async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing in .env.local");
  g._mongo ??= new MongoClient(uri).connect();
  return (await g._mongo).db("giveandtake");
}

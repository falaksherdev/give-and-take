import { auth } from "@/auth";

export async function requireEmail() {
  const s = await auth();
  return s?.user?.email?.toLowerCase() ?? null;
}
export const unauthorized = () => Response.json({ error: "Not signed in" }, { status: 401 });
export const badRequest = () => Response.json({ error: "Invalid request" }, { status: 400 });

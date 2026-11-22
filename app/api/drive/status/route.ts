import { requireEmail, unauthorized } from "@/lib/session";
import { driveStatus } from "@/lib/drive";

export async function GET() {
  const email = await requireEmail();
  if (!email) return unauthorized();
  return Response.json(await driveStatus(email));
}

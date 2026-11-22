import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getDb } from "@/lib/mongodb";

// Only the emails listed in ALLOWED_EMAILS (comma separated) can sign in.
const allowed = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      authorization: {
        params: {
          // drive.file lets the app see only the files it creates itself.
          scope: "openid email profile https://www.googleapis.com/auth/drive.file",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      return !!email && allowed.includes(email);
    },
    async jwt({ token, account }) {
      // Keep the Google tokens in your database (never in the browser).
      if (account?.refresh_token && token.email) {
        const db = await getDb();
        await db.collection("google_tokens").updateOne(
          { userEmail: token.email.toLowerCase() },
          { $set: { refreshToken: account.refresh_token, accessToken: account.access_token, expiresAt: (account.expires_at ?? 0) * 1000 } },
          { upsert: true },
        );
      }
      return token;
    },
  },
});

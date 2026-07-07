import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { linkGoogleAccount } from "@/lib/auth-link";
import { getClientIp, hashClientIp } from "@/lib/api";
import { hashEmail, isLoginRateLimited, recordFailedLogin } from "@/lib/auth-login-rate-limit";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  // NextAuth v5 reads AUTH_SECRET by default; fall back to NEXTAUTH_SECRET
  // so .env.example's documented name keeps working.
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // MSW/Playwright bypass — active ONLY when AUTH_BYPASS_FOR_PLAYWRIGHT=1
        // AND NODE_ENV !== "production" so this never runs in a real deploy.
        // Never set AUTH_BYPASS_FOR_PLAYWRIGHT in production.
        if (
          process.env.AUTH_BYPASS_FOR_PLAYWRIGHT === "1" &&
          process.env.NODE_ENV !== "production"
        ) {
          if (
            parsed.data.email === "you@stash.it" &&
            parsed.data.password === "testpassword123"
          ) {
            return { id: "user_demo", email: "you@stash.it", name: "You", image: null };
          }
          return null;
        }

        const ipHash = hashClientIp(getClientIp(request as Request));
        const emailHash = hashEmail(parsed.data.email);

        if (await isLoginRateLimited(ipHash, emailHash)) return null;

        const user = await db.user.findUnique({ where: { email: parsed.data.email } });
        if (!user?.password) {
          void recordFailedLogin(ipHash, emailHash);
          return null;
        }

        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) {
          void recordFailedLogin(ipHash, emailHash);
          return null;
        }

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const userId = await linkGoogleAccount({
          email: user.email,
          name: user.name,
          image: user.image,
        });
        if (!userId) return false;
        user.id = userId;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) session.user.id = token.id as string;
      return session;
    },
  },
});

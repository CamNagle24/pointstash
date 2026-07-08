import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { linkGoogleAccount } from "@/lib/auth-link";
import { authenticateCredentials } from "@/lib/auth-credentials";

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
        return authenticateCredentials(credentials, request as Request);
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

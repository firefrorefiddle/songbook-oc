import { SvelteKitAuth } from "@auth/sveltekit";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "@auth/sveltekit/providers/credentials";
import Google from "@auth/sveltekit/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { AUTH_SECRET } from "$env/static/private";
// import {
//   GOOGLE_CLIENT_ID,
//   GOOGLE_CLIENT_SECRET,
// } from "$env/static/private";

export const { handle, signIn, signOut } = SvelteKitAuth({
  adapter: PrismaAdapter(prisma as never),
  // JWT strategy avoids needing a Session table in SQLite
  session: { strategy: "jwt" },
  secret: AUTH_SECRET,
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const input = credentials.email as string;
        const user = await prisma.user.findFirst({
          where: {
            OR: [{ email: input }, { username: input }],
          },
        });

        if (!user?.passwordHash || !user.isActive) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          role: user.role,
          isActive: user.isActive,
        };
      },
    }),
    // Google({
    //   clientId: GOOGLE_CLIENT_ID,
    //   clientSecret: GOOGLE_CLIENT_SECRET,
    // }),
  ],
  callbacks: {
    // Persist role, firstName, lastName, and username into the JWT so they're available on every request
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.firstName = (user as any).firstName;
        token.lastName = (user as any).lastName;
        token.username = (user as any).username;
        token.isActive = (user as any).isActive;
      }
      // Always refresh role and names from DB on each JWT creation/refresh
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
        });
        token.role = dbUser?.role ?? "USER";
        token.isActive = dbUser?.isActive ?? false;
        if (dbUser) {
          token.id = dbUser.id;
          token.firstName = dbUser.firstName;
          token.lastName = dbUser.lastName;
          token.username = dbUser.username;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        // Cast needed because AdapterUser doesn't reflect our module augmentation
        const user = session.user as {
          id: string;
          role: string;
          isActive?: boolean;
          firstName?: string | null;
          lastName?: string | null;
          username?: string | null;
        } & typeof session.user;
        user.id = token.id as string;
        user.role = token.role as string;
        user.isActive = token.isActive as boolean | undefined;
        user.firstName = token.firstName as string | null;
        user.lastName = token.lastName as string | null;
        user.username = token.username as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

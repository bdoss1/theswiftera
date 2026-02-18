import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { config } from "./config";

/**
 * NextAuth.js configuration.
 * Authentication is optional and controlled via AUTH_ENABLED env var.
 *
 * When enabled, uses a simple credentials provider with a single admin account.
 * Configure via ADMIN_USERNAME and ADMIN_PASSWORD environment variables.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Admin Login",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!config.auth.enabled) {
          // Auth disabled — auto-authorize
          return { id: "1", name: "Admin", email: "admin@swifttok.local" };
        }

        const adminUsername = process.env.ADMIN_USERNAME || "admin";
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminPassword) {
          throw new Error("ADMIN_PASSWORD must be set when AUTH_ENABLED=true");
        }

        if (
          credentials?.username === adminUsername &&
          credentials?.password === adminPassword
        ) {
          return { id: "1", name: "Admin", email: "admin@swifttok.local" };
        }

        return null;
      },
    }),
  ],
  secret: config.auth.secret || "swifttok-dev-secret-change-me",
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});

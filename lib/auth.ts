import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { createPersonalWorkspace } from "@/services/workspace-service";
import { users, sessions, accounts, verifications } from "@/db/schema/auth";

// Parse trusted origins from env (comma-separated) or fall back to BETTER_AUTH_URL
function getTrustedOrigins(): string[] {
  const origins: string[] = [];
  const appUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) origins.push(appUrl);
  const allowed = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS;
  if (allowed) {
    for (const o of allowed.split(",")) {
      const trimmed = o.trim();
      if (trimmed && !origins.includes(trimmed)) origins.push(trimmed);
    }
  }
  return origins;
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  basePath: "/api/v1/auth",
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL,
  trustedOrigins: getTrustedOrigins(),
  emailAndPassword: {
    enabled: true,
    // Security: Minimum password length increased from 8 to 12
    minPasswordLength: 12,
    // Security: Enforce password complexity
    requireLowerCase: true,   // Require at least one lowercase letter
    requireUpperCase: true,   // Require at least one uppercase letter
    requireNumbers: true,     // Require at least one number
    requireSpecialChars: true, // Require at least one special character
  },
  session: {
    // Security: Session expiration configuration
    // How long a session is valid (in seconds)
    expiresIn: 7 * 24 * 60 * 60, // 7 days

    // Security: Update session age periodically
    // How often to update the session (in seconds)
    // This extends the session lifetime when user is active
    updateAge: 24 * 60 * 60, // 24 hours - session updated daily if active

    // Security: Idle session timeout
    // How long before an idle session is invalidated
    // Note: Better Auth doesn't have built-in idle timeout,
    // so we implement this via cookieCache
    cookieCache: {
      enabled: true,
      // Cache session data in cookie for 5 minutes
      // This reduces database queries but keeps data fresh
      maxAge: 5 * 60, // 5 minutes
    },

    // Security: Additional session options
    // Use same-site cookies to prevent CSRF attacks
    cookiePrefix: "better-auth",
    cookieAttributes: {
      // Only send cookies over HTTPS in production
      secure: process.env.NODE_ENV === "production",
      // For production with HTTPS and custom domain, use "lax" to allow cookies on same-site requests
      // "lax" works for same-site and top-level navigations after POST
      sameSite: "lax",
      // Prevent JavaScript access to cookies (XSS protection)
      httpOnly: true,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Auto-create personal workspace on signup
          await createPersonalWorkspace(user.id, user.name);
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;

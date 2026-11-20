import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { ensureWalletWithSignupBonus } from "@/lib/credits";

let cachedAuth: ReturnType<typeof createAuth> | null = null;

function createAuth() {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET || "dev-fallback-secret-change-in-production",
    baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    account: {
      storeStateStrategy: "database",
      skipStateCookieCheck: true,
    },
    socialProviders:
      googleClientId && googleClientSecret
        ? {
            google: {
              clientId: googleClientId,
              clientSecret: googleClientSecret,
            },
          }
        : undefined,
    databaseHooks: {
      user: {
        create: {
          after: async (createdUser) => {
            try {
              await ensureWalletWithSignupBonus(createdUser.id);
            } catch (err) {
              console.error("[auth] Failed to initialize signup bonus wallet:", err);
            }
          },
        },
      },
    },
  });
}

export function getAuth() {
  if (!cachedAuth) {
    cachedAuth = createAuth();
  }
  return cachedAuth;
}

export async function getServerSession(headers: Headers) {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  return getAuth().api.getSession({ headers });
}

import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { ensureWalletWithSignupBonus } from "@/lib/credits";
import { checkTurnstile, type TurnstileAction } from "@/lib/turnstile";
import { requiresVerifiedEmail, sendVerificationEmail } from "@/lib/verification-email";

let cachedAuth: ReturnType<typeof createAuth> | null = null;

const protectedActions = new Map<string, TurnstileAction>([
  ["/sign-up/email", "signup"], ["/sign-in/email", "login"],
  ["/sign-in/social", "google"], ["/send-verification-email", "resend"],
]);

function createAuth() {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const requireEmailVerification = requiresVerifiedEmail();
  if (requireEmailVerification && !process.env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET is required to sign email verification links");
  }

  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET || (process.env.NODE_ENV === "development" ? "dev-fallback-secret-change-in-production" : undefined),
    baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      requireEmailVerification,
    },
    emailVerification: requireEmailVerification ? {
      sendOnSignUp: true,
      sendVerificationEmail,
      afterEmailVerification: async (verifiedUser) => { await ensureWalletWithSignupBonus(verifiedUser.id); },
    } : undefined,
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const action = protectedActions.get(ctx.path);
        if (!action) return;
        const failure = await checkTurnstile(ctx.headers, action);
        if (failure) throw new APIError(failure.status === 403 ? "FORBIDDEN" : "SERVICE_UNAVAILABLE", {
          code: failure.code, message: failure.message,
        });
        if (requireEmailVerification && (action === "signup" || action === "resend") &&
          (!process.env.RESEND_API_KEY || !process.env.AUTH_EMAIL_FROM)) {
          throw new APIError("SERVICE_UNAVAILABLE", { code: "EMAIL_UNAVAILABLE", message: "Verification email is unavailable." });
        }
      }),
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
            if (requireEmailVerification && !createdUser.emailVerified) return;
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

import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import {
  ACCESS_NOT_ALLOWED_CODE,
  ACCESS_NOT_ALLOWED_MESSAGE,
  isEmailAllowed,
} from "@/lib/access-control";
import { ensureWalletWithSignupBonus } from "@/lib/credits";
import { checkTurnstile, type TurnstileAction } from "@/lib/turnstile";
import { requiresVerifiedEmail, sendVerificationEmail } from "@/lib/verification-email";

let cachedAuth: ReturnType<typeof createAuth> | null = null;

const protectedActions = new Map<string, TurnstileAction>([
  ["/sign-up/email", "signup"], ["/sign-in/email", "login"],
  ["/sign-in/social", "google"], ["/send-verification-email", "resend"],
]);

const emailCheckedPaths = new Set([
  "/sign-up/email",
  "/sign-in/email",
  "/send-verification-email",
]);

function assertAllowedEmail(email: unknown) {
  if (!isEmailAllowed(typeof email === "string" ? email : "")) {
    throw new APIError("FORBIDDEN", {
      code: ACCESS_NOT_ALLOWED_CODE,
      message: ACCESS_NOT_ALLOWED_MESSAGE,
    });
  }
}

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
        if (emailCheckedPaths.has(ctx.path)) {
          const body = ctx.body as { email?: unknown } | undefined;
          assertAllowedEmail(body?.email);
        }
        if (requireEmailVerification && (action === "signup" || action === "resend") &&
          (!process.env.RESEND_API_KEY || !process.env.AUTH_EMAIL_FROM)) {
          throw new APIError("SERVICE_UNAVAILABLE", { code: "EMAIL_UNAVAILABLE", message: "Verification email is unavailable." });
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/get-session") return;
        const returned = ctx.context.returned as { user?: { email?: string | null } } | null | undefined;
        if (returned?.user && !isEmailAllowed(returned.user.email)) {
          return ctx.json(null);
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
          before: async (newUser) => {
            assertAllowedEmail(newUser.email);
          },
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
      session: {
        create: {
          before: async (newSession) => {
            const rows = await getDb()
              .select({ email: schema.user.email })
              .from(schema.user)
              .where(eq(schema.user.id, newSession.userId))
              .limit(1);
            assertAllowedEmail(rows[0]?.email);
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
  const session = await getAuth().api.getSession({ headers });
  if (session?.user && !isEmailAllowed(session.user.email)) {
    return null;
  }
  return session;
}

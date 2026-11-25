import { and, desc, eq, gte, sql, type SQL } from "drizzle-orm";
import { getDb, creditWallets, creditLedger, user, type CreditLedgerType } from "@/db";
import { getSignupBonusCredits } from "@/config/pricing";
import { getSignupBonusCreditsForEmail } from "@/lib/access-control";
import { requiresVerifiedEmail } from "@/lib/verification-email";

export async function ensureWalletWithSignupBonus(userId: string): Promise<number> {
  const db = getDb();
  const verifyEmail = requiresVerifiedEmail();
  // Without the migration, all existing wallets must be treated as already claimed.
  const claimState = verifyEmail ? creditWallets.signupBonusClaimed
    : sql<boolean>`coalesce((to_jsonb(${creditWallets})->>'signup_bonus_claimed')::boolean, true)`;
  const readWallet = async () => (await db.select({ balance: creditWallets.balance, claimed: claimState })
    .from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1))[0];
  let wallet = await readWallet();
  if (wallet?.claimed) return wallet.balance;
  const userRow = (
    await db.select({ email: user.email }).from(user).where(eq(user.id, userId)).limit(1)
  )[0];
  const bonus = getSignupBonusCreditsForEmail(userRow?.email, getSignupBonusCredits());
  const grant = async (mutation: SQL) => {
    const result = await db.execute<{ balance: number }>(sql`
      with claimed as (${mutation} returning user_id, balance), recorded as (
        insert into ${creditLedger} (user_id, delta, type, note)
        select user_id, ${bonus}::integer, 'SIGNUP_BONUS', 'Welcome signup bonus credits' from claimed
        where ${bonus}::integer > 0
      ) select balance from claimed
    `);
    return result.rows[0]?.balance;
  };
  if (!wallet && !verifyEmail) {
    const opened = await grant(sql`insert into ${creditWallets} (user_id, balance) values (${userId}, ${bonus}) on conflict (user_id) do nothing`);
    if (opened !== undefined) return opened;
    wallet = await readWallet();
    if (!wallet) throw new Error("Credit wallet was not created");
    if (wallet.claimed) return wallet.balance;
  }
  if (!wallet) {
    await db.insert(creditWallets).values({ userId, balance: 0, signupBonusClaimed: false }).onConflictDoNothing();
  }
  const eligible = verifyEmail
    ? sql`exists (select 1 from ${user} where ${user.id} = ${userId} and ${user.emailVerified})`
    : sql`true`;
  const claimed = await grant(sql`
    update ${creditWallets} set signup_bonus_claimed = true, balance = balance + ${bonus}, updated_at = now()
    where ${creditWallets.userId} = ${userId} and not ${creditWallets.signupBonusClaimed} and ${eligible}
  `);
  return claimed ?? (await readWallet())?.balance ?? 0;
}

export async function getCreditBalance(userId: string): Promise<number> {
  return ensureWalletWithSignupBonus(userId);
}

export async function getCreditLedger(userId: string, limit = 30) {
  const db = getDb();
  return db
    .select()
    .from(creditLedger)
    .where(eq(creditLedger.userId, userId))
    .orderBy(desc(creditLedger.createdAt))
    .limit(limit);
}

/**
 * Atomically deducts credits if balance >= cost.
 * Returns the new balance on success, or null if insufficient balance.
 */
export async function holdCredits(
  userId: string,
  cost: number,
  refId: string,
  note?: string
): Promise<number | null> {
  await ensureWalletWithSignupBonus(userId);
  const db = getDb();

  const updated = await db
    .update(creditWallets)
    .set({
      balance: sql`${creditWallets.balance} - ${cost}`,
      updatedAt: new Date(),
    })
    .where(and(eq(creditWallets.userId, userId), gte(creditWallets.balance, cost)))
    .returning({ balance: creditWallets.balance });

  if (updated.length === 0) {
    return null;
  }

  await db.insert(creditLedger).values({
    userId,
    delta: -cost,
    type: "HOLD",
    refId,
    note: note ?? "Sticker pack generation hold",
  });

  return updated[0].balance;
}

/**
 * Adds credits to a user's wallet (used for REFUND or PURCHASE).
 */
export async function addCredits(
  userId: string,
  amount: number,
  type: Extract<CreditLedgerType, "REFUND" | "PURCHASE">,
  refId: string,
  note?: string
): Promise<number> {
  await ensureWalletWithSignupBonus(userId);
  const db = getDb();

  const updated = await db
    .update(creditWallets)
    .set({
      balance: sql`${creditWallets.balance} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(creditWallets.userId, userId))
    .returning({ balance: creditWallets.balance });

  await db.insert(creditLedger).values({
    userId,
    delta: amount,
    type,
    refId,
    note,
  });

  return updated[0]?.balance ?? 0;
}

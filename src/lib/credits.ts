import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb, creditWallets, creditLedger, type CreditLedgerType } from "@/db";
import { getSignupBonusCredits } from "@/config/pricing";

export async function ensureWalletWithSignupBonus(userId: string): Promise<number> {
  const db = getDb();
  const existing = await db
    .select()
    .from(creditWallets)
    .where(eq(creditWallets.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].balance;
  }

  const bonus = getSignupBonusCredits();
  const inserted = await db
    .insert(creditWallets)
    .values({ userId, balance: bonus })
    .onConflictDoNothing()
    .returning();

  if (inserted.length > 0 && bonus > 0) {
    await db.insert(creditLedger).values({
      userId,
      delta: bonus,
      type: "SIGNUP_BONUS",
      note: "Welcome signup bonus credits",
    });
    return inserted[0].balance;
  }

  const refetch = await db
    .select()
    .from(creditWallets)
    .where(eq(creditWallets.userId, userId))
    .limit(1);
  return refetch[0]?.balance ?? 0;
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
    .returning();

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
    .returning();

  await db.insert(creditLedger).values({
    userId,
    delta: amount,
    type,
    refId,
    note,
  });

  return updated[0]?.balance ?? 0;
}

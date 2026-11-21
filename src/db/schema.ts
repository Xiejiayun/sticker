import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

// ============================================================================
// Better Auth Core Tables
// ============================================================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// Credits & Billing Tables
// ============================================================================

export const creditWallets = pgTable("credit_wallets", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CreditLedgerType = "SIGNUP_BONUS" | "PURCHASE" | "HOLD" | "REFUND";

export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    type: text("type").$type<CreditLedgerType>().notNull(),
    refId: text("ref_id"),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("credit_ledger_user_idx").on(table.userId, table.createdAt)]
);

export const creditPackages = pgTable("credit_packages", {
  id: text("id").primaryKey(),
  nameZh: text("name_zh").notNull(),
  nameEn: text("name_en").notNull(),
  credits: integer("credits").notNull(),
  priceCents: integer("price_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export type PaymentOrderStatus = "PENDING" | "PAID" | "FAILED";
export type PaymentProviderName = "stripe" | "wechat" | "alipay";

export const paymentOrders = pgTable(
  "payment_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    packageId: text("package_id").notNull(),
    provider: text("provider").$type<PaymentProviderName>().notNull(),
    externalId: text("external_id").unique(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("usd"),
    creditsGranted: integer("credits_granted").notNull(),
    status: text("status").$type<PaymentOrderStatus>().notNull().default("PENDING"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    paidAt: timestamp("paid_at"),
  },
  (table) => [index("payment_orders_user_idx").on(table.userId, table.createdAt)]
);

// ============================================================================
// Sticker Packs Table
// ============================================================================

export type StickerPackStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type GridSize = "3x3" | "4x4";
export type CaptionMode = "none" | "zh" | "en";

export interface StickerSlotSnapshot {
  index: number;
  pose: string;
  caption: string;
}

export interface ReferenceImageRecord {
  url: string;
  role: "character" | "pet" | "outfit" | "prop";
  mimeType: string;
}

export const stickerPacks = pgTable(
  "sticker_packs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status").$type<StickerPackStatus>().notNull().default("PENDING"),
    gridSize: text("grid_size").$type<GridSize>().notNull().default("3x3"),
    styleId: text("style_id").notNull(),
    themeId: text("theme_id").notNull(),
    captionMode: text("caption_mode").$type<CaptionMode>().notNull().default("zh"),
    userPrompt: text("user_prompt").notNull().default(""),
    slotsConfig: jsonb("slots_config").$type<StickerSlotSnapshot[]>().notNull(),
    // Keep physical column names for a reversible rollout; values are stable R2 URLs.
    referenceImages: jsonb("reference_keys").$type<ReferenceImageRecord[]>().notNull().default([]),
    finalPrompt: text("final_prompt"),
    masterImageUrl: text("master_image_key"),
    creditsCost: integer("credits_cost").notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("sticker_packs_user_idx").on(table.userId, table.createdAt)]
);

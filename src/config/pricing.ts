import type { GridSize } from "@/db/schema";

export interface CreditPackageConfig {
  id: string;
  nameZh: string;
  nameEn: string;
  descriptionZh: string;
  descriptionEn: string;
  credits: number;
  priceCents: number;
  currency: "usd";
  popular?: boolean;
}

export function getSignupBonusCredits(): number {
  const parsed = Number(process.env.CREDITS_SIGNUP_BONUS ?? "20");
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 20;
}

export function getGridCreditCost(gridSize: GridSize): number {
  if (gridSize === "4x4") {
    const parsed = Number(process.env.CREDITS_COST_4X4 ?? "15");
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 15;
  }
  const parsed = Number(process.env.CREDITS_COST_3X3 ?? "10");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

export const DEFAULT_CREDIT_PACKAGES: CreditPackageConfig[] = [
  {
    id: "pack-starter",
    nameZh: "尝鲜积分包",
    nameEn: "Starter Pack",
    descriptionZh: "可生成 5 套 3×3 或 3 套 4×4 4K 表情包，永不过期",
    descriptionEn: "5× (3×3) or 3× (4×4) 4K sticker packs. Never expires.",
    credits: 50,
    priceCents: 499,
    currency: "usd",
  },
  {
    id: "pack-creator",
    nameZh: "创作者积分包",
    nameEn: "Creator Pack",
    descriptionZh: "最受欢迎，可生成 15 套 3×3 或 10 套 4×4 4K 表情包",
    descriptionEn: "Most popular. 15× (3×3) or 10× (4×4) 4K sticker packs.",
    credits: 150,
    priceCents: 1299,
    currency: "usd",
    popular: true,
  },
  {
    id: "pack-studio",
    nameZh: "工作室大礼包",
    nameEn: "Studio Pack",
    descriptionZh: "高性价比批量创作，可生成 40 套 3×3 4K 表情包",
    descriptionEn: "Best value for power creators. 40× (3×3) 4K packs.",
    credits: 400,
    priceCents: 2999,
    currency: "usd",
  },
];

export function getCreditPackageById(id: string): CreditPackageConfig | undefined {
  return DEFAULT_CREDIT_PACKAGES.find((pkg) => pkg.id === id);
}

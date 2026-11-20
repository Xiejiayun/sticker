import { NextResponse } from "next/server";
import { isR2Configured } from "@/lib/r2";

export async function GET() {
  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    config: {
      database: Boolean(process.env.DATABASE_URL),
      r2: isR2Configured(),
      aiProvider: process.env.AI_IMAGE_PROVIDER || "mock",
      stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    },
  });
}

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getCreditBalance, getCreditLedger } from "@/lib/credits";

export async function GET(request: Request) {
  const session = await getServerSession(request.headers);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [balance, ledger] = await Promise.all([
    getCreditBalance(session.user.id),
    getCreditLedger(session.user.id, 30),
  ]);

  return NextResponse.json({ balance, ledger });
}

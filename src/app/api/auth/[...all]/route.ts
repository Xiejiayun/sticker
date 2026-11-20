import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

export async function GET(request: Request) {
  const { GET: handler } = toNextJsHandler(getAuth());
  return handler(request);
}

export async function POST(request: Request) {
  const { POST: handler } = toNextJsHandler(getAuth());
  return handler(request);
}

export function checkStudioMutation(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (origin !== null && origin !== new URL(process.env.BETTER_AUTH_URL || request.url).origin) {
    return Response.json({ error: "Cross-origin request not allowed" }, { status: 403 });
  }
  const mediaType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (mediaType !== "application/json") {
    return Response.json({ error: "Expected application/json" }, { status: 415 });
  }
  return null;
}

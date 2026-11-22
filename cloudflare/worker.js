import routes from "../.open-next/static-routes.json";
import { locales, pages } from "./public-routes.json";
import { serveMedia } from "./media.js";

function preferredLocale(request) {
  const cookie = request.headers.get("cookie")?.match(/(?:^|;\s*)NEXT_LOCALE=(zh|en)(?:;|$)/)?.[1];
  if (cookie) return cookie;
  const languages = (request.headers.get("accept-language") ?? "").split(",")
    .map((part) => {
      const [language, ...parameters] = part.trim().toLowerCase().split(";");
      const quality = parameters.find((value) => value.trim().startsWith("q="));
      return { locale: language.split("-")[0], quality: quality ? Number(quality.trim().slice(2)) : 1 };
    }).filter(({ quality }) => quality > 0 && quality <= 1)
    .sort((a, b) => b.quality - a.quality);
  return languages.find(({ locale }) => locales.includes(locale))?.locale ?? "zh";
}

function redirect(url, status = 307, extraHeaders = {}) {
  return new Response(null, {
    status,
    headers: { Location: url.href, "Cache-Control": "private, no-store", ...extraHeaders },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/media/")) return serveMedia(request, env);
    // Keep authorization, cookies, mutations and all API responses in Next/Better Auth.
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      const { default: worker } = await import("../.open-next/worker.js");
      return worker.fetch(request, env, ctx);
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    const path = url.pathname.replace(/\/$/, "");

    // Redirect legacy /zh/* and /en/* URLs to clean prefix-free paths while saving locale preference.
    const prefixed = path.match(/^\/(zh|en)(\/.*)?$/);
    if (prefixed) {
      const locale = prefixed[1];
      const rest = prefixed[2] || "";
      const legacyPack = rest.match(/^\/packs\/([^/]+)$/);
      if (legacyPack && legacyPack[1] !== "view") {
        url.pathname = "/packs/view";
        try {
          url.searchParams.set("id", decodeURIComponent(legacyPack[1]));
        } catch {
          return new Response("Invalid pack ID", { status: 400 });
        }
      } else {
        url.pathname = rest || "/";
      }
      return redirect(url, 307, {
        "Set-Cookie": `NEXT_LOCALE=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`,
      });
    }

    const legacyPack = path.match(/^\/packs\/([^/]+)$/);
    if (legacyPack && legacyPack[1] !== "view") {
      url.pathname = "/packs/view";
      try {
        url.searchParams.set("id", decodeURIComponent(legacyPack[1]));
      } catch {
        return new Response("Invalid pack ID", { status: 400 });
      }
      return redirect(url);
    }

    if (pages.includes(path)) {
      if (path !== "" && path !== url.pathname) {
        url.pathname = path;
        return redirect(url, 308);
      }
      const locale = preferredLocale(request);
      const routeKey = `/${locale}${path}`;
      const assetBase = routes[routeKey];
      if (!assetBase) return new Response("Static page unavailable", { status: 503 });
      const rsc = request.headers.get("RSC") === "1";
      url.pathname = `${assetBase}.${rsc ? "rsc" : "html"}`;
      url.search = "";
      // Do not forward browser cookies, conditional headers or RSC headers to Assets.
      const asset = await env.ASSETS.fetch(new Request(url, { method: request.method }));
      if (!asset.ok) return new Response("Static page unavailable", { status: 503 });
      const headers = new Headers(asset.headers);
      headers.set("Content-Type", rsc ? "text/x-component; charset=utf-8" : "text/html; charset=utf-8");
      headers.set("Cache-Control", "private, no-cache, must-revalidate");
      headers.set("Vary", "Cookie, Accept-Language, RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Accept-Encoding");
      headers.set("X-Sticker-Rendering", "static");
      headers.set("X-Sticker-Locale", locale);
      return new Response(asset.body, { status: asset.status, headers });
    }
    // Unknown pages must not load the SSR bundle or masquerade as the home page.
    const asset = await env.ASSETS.fetch(request);
    return asset.status === 404 ? new Response("Not found", { status: 404 }) : asset;
  },
};

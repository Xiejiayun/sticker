import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";

const root = process.cwd();
const { locales, pages } = JSON.parse(await readFile(resolve(root, "cloudflare/public-routes.json"), "utf8"));
const manifest = JSON.parse(await readFile(resolve(root, ".next/prerender-manifest.json"), "utf8"));
const routes = {};

// Only explicitly public, fully prerendered pages may bypass the Next server.
// Fail the build rather than accidentally publishing a dynamic/private page.
for (const locale of locales) {
  for (const page of pages) {
    const route = `/${locale}${page}`;
    const entry = manifest.routes[route];
    if (!entry || entry.initialRevalidateSeconds !== false) {
      throw new Error(`Expected a fully static page: ${route}`);
    }
    routes[route] = `/__pages${route}`;
    for (const extension of ["html", "rsc"]) {
      const target = resolve(root, `.open-next/assets/__pages${route}.${extension}`);
      await mkdir(dirname(target), { recursive: true });
      await copyFile(resolve(root, `.next/server/app${route}.${extension}`), target);
    }
  }
}
await writeFile(resolve(root, ".open-next/static-routes.json"), JSON.stringify(routes));
console.log(`Prepared ${Object.keys(routes).length} public HTML and RSC pages for Workers Assets.`);

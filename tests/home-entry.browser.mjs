import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright-core";

const origin = new URL(process.env.HOME_UI_ORIGIN || "http://127.0.0.1:4387");
assert.ok(origin.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname), "Use a loopback preview");
const home = new URL("/?style=pixel-retro&theme=office-worker", origin);
const sessionPath = "/api/auth/get-session";
const user = { id: "home-fixture", name: "Home Tester", email: "home@example.invalid" };

test("home shows the public landing page only to guests", async suite => {
  const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : "chrome" });
  suite.after(() => browser.close());

  for (const [locale, brand, cta, sample, studio] of [
    ["zh", "贴纸酱", "立即免费制作", "早安", "表情包创作工作台"],
    ["en", "StickerJam", "Start Creating Free", "GM!", "Sticker Pack Studio"],
  ]) {
    await suite.test(`${locale}: guest visit and signed-in refresh`, async scenario => {
      const page = await browser.newPage({ locale, serviceWorkers: "block" });
      scenario.after(() => page.close());
      let session = null;
      let gate = Promise.withResolvers();
      let sessionRequests = 0;
      await page.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (url.pathname === sessionPath) {
          sessionRequests++;
          await gate.promise;
          return route.fulfill({ json: session, headers: {
            "Access-Control-Allow-Origin": origin.origin, "Access-Control-Allow-Credentials": "true",
          } });
        }
        if (url.origin !== origin.origin || route.request().method() !== "GET") return route.abort();
        if (url.pathname === "/api/credits") return route.fulfill({ json: { balance: 100 } });
        return url.pathname.startsWith("/api/") ? route.abort() : route.continue();
      });

      const guestLink = page.getByRole("link", { name: cta, exact: true });
      const brandLink = page.getByRole("banner").getByRole("link", { name: brand, exact: true });
      const example = page.getByRole("img", { name: sample, exact: true });
      async function checkPending(navigate) {
        const request = page.waitForRequest(req => new URL(req.url()).pathname === sessionPath);
        await navigate();
        await request;
        try {
          await page.getByRole("main").getByRole("status").waitFor();
          assert.equal(await guestLink.isVisible(), false);
          assert.equal(await example.isVisible(), false);
          assert.equal(page.url(), home.href);
          return await page.evaluate(() => history.length);
        } finally {
          gate.resolve();
        }
      }

      await checkPending(() => page.goto(home.href));
      await guestLink.waitFor();
      await example.waitFor();
      assert.equal(await guestLink.getAttribute("href"), "/studio");
      assert.equal(await brandLink.getAttribute("href"), "/");
      assert.equal(sessionRequests, 1);

      gate = Promise.withResolvers();
      const refetch = page.waitForRequest(req => new URL(req.url()).pathname === sessionPath);
      const refreshed = page.waitForResponse(response => new URL(response.url()).pathname === sessionPath);
      await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
      await refetch;
      try {
        assert.ok(await guestLink.isVisible(), "a background session check must not collapse the landing page");
      } finally {
        gate.resolve();
        await refreshed;
      }

      session = { user, session: { userId: user.id } };
      gate = Promise.withResolvers();
      const historyLength = await checkPending(() => page.reload());
      await page.waitForURL(new URL(`/studio${home.search}`, origin).href);
      await page.getByRole("heading", { name: studio, exact: true }).waitFor();
      await page.getByRole("button", { name: /复古像素风|Retro Pixel Art/ }).getByText(/^(已选|Selected)$/).waitFor();
      assert.equal(await page.evaluate(() => history.length), historyLength);
      assert.equal(await page.locator("html").getAttribute("lang"), locale);
      assert.equal(await guestLink.isVisible(), false);
      assert.equal(await example.isVisible(), false);
      assert.equal(await brandLink.getAttribute("href"), "/studio");

      await page.locator('header nav a[href="/pricing"]').click();
      await page.waitForURL(new URL("/pricing", origin).href);
      await brandLink.click();
      await page.waitForURL(new URL("/studio", origin).href);
      await page.getByRole("heading", { name: studio, exact: true }).waitFor();
    });
  }

  await suite.test("the static landing page remains usable without JavaScript", async scenario => {
    const page = await browser.newPage({ javaScriptEnabled: false, locale: "en" });
    scenario.after(() => page.close());
    await page.route("**/*", route => new URL(route.request().url()).origin === origin.origin ? route.continue() : route.abort());
    await page.goto(origin.href);
    await page.getByRole("link", { name: "Start Creating Free" }).waitFor();
    assert.equal(await page.getByRole("main").getByRole("status").isVisible(), false);
  });
});

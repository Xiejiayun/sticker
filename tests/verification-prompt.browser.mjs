import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright-core";

const origin = new URL(process.env.VERIFICATION_UI_ORIGIN || "http://localhost:4387");
assert.ok(origin.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname), "Use a loopback preview with a test site key");

test("verification prompt stays centered, fits the viewport and can be retried", async ctx => {
  const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : "chrome" });
  ctx.after(() => browser.close());
  for (const [width, height, size] of [[1920, 960, "flexible"], [320, 640, "compact"]]) {
    await ctx.test(`${width}px: ${size}`, async scenario => {
      const page = await browser.newPage({ viewport: { width, height }, locale: "en-US" });
      scenario.after(() => page.close());
      let submissions = 0;
      await page.route("**/*", route => {
        const url = new URL(route.request().url());
        if (url.pathname === "/api/auth/sign-in/email") { submissions++; return route.abort(); }
        return url.origin === origin.origin ? route.continue() : route.abort();
      });
      await page.addInitScript(() => {
        window.turnstile = {
          render(host, options) {
            const frame = document.createElement("iframe");
            frame.title = "Local UI fixture (no token)";
            frame.style.width = options.size === "compact" ? "150px" : "100%";
            frame.style.minWidth = options.size === "compact" ? "150px" : "300px";
            frame.style.height = options.size === "compact" ? "140px" : "65px";
            frame.dataset.size = options.size;
            host.append(frame);
            window.requestInteraction = options["before-interactive-callback"];
            return "local-fixture";
          },
          remove() { document.querySelector('iframe[title="Local UI fixture (no token)"]')?.remove(); },
        };
      });
      await page.goto(new URL("/auth", origin).href);
      await page.locator('input[type="email"]').fill("layout@example.invalid");
      await page.locator('input[type="password"]').fill("local-layout-only");
      const submit = page.locator('button[type="submit"]');
      const panel = page.getByRole("dialog");
      const frame = page.locator('iframe[title="Local UI fixture (no token)"]');
      await submit.click();
      await frame.waitFor({ state: "attached" });
      assert.equal(await panel.isVisible(), false);
      const mountedFrame = await frame.elementHandle();
      if (size === "compact") {
        await panel.waitFor();
        assert.match(await panel.getByRole("status").innerText(), /Checking your request|正在验证/);
      }
      await page.evaluate(() => window.requestInteraction());
      await panel.waitFor();
      await panel.getByText(/checkbox below|勾选下方/).waitFor();
      assert.equal(await panel.evaluate(element => element.matches(":modal")), true);
      assert.equal(await frame.evaluate((element, previous) => element === previous, mountedFrame), true);
      assert.equal(await frame.getAttribute("data-size"), size);
      const box = await panel.boundingBox();
      assert.ok(Math.abs(box.x + box.width / 2 - width / 2) <= 1 && Math.abs(box.y + box.height / 2 - height / 2) <= 1);
      assert.ok(await panel.evaluate(element => element.scrollWidth <= element.clientWidth));
      const cancel = panel.getByRole("button", { name: /Cancel verification|取消验证/ });
      assert.ok((await cancel.boundingBox()).height >= 44);
      if (size === "flexible") {
        for (const layoutWidth of [320, 305]) {
          await page.setViewportSize({ width: layoutWidth, height: 640 });
          assert.equal(await frame.evaluate((element, previous) => element === previous, mountedFrame), true);
          assert.ok(await panel.evaluate(element => element.scrollWidth <= element.clientWidth), `widget overflows at ${layoutWidth}px`);
        }
      }
      await page.keyboard.press("Escape");
      await panel.waitFor({ state: "detached" });
      await page.waitForFunction(() => document.activeElement?.matches('button[type="submit"]'));
      assert.equal(await page.locator('input[type="email"]').inputValue(), "layout@example.invalid");
      await submit.click();
      await frame.waitFor({ state: "attached" });
      await page.evaluate(() => window.requestInteraction());
      await cancel.click();
      await panel.waitFor({ state: "detached" });
      assert.equal(submissions, 0);
    });
  }
});

test("signed-in studio uploads two photos and submits generation without requesting Turnstile", async ctx => {
  const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : "chrome" });
  ctx.after(() => browser.close());
  const page = await browser.newPage({ serviceWorkers: "block" });
  const user = { id: "studio-fixture", name: "Studio Fixture", email: "studio@example.invalid" };
  const presigns = [], uploads = [], generations = [], challenges = [];
  await page.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.hostname === "challenges.cloudflare.com") challenges.push(url.pathname);
    if (url.pathname === "/api/auth/get-session" && request.method() === "GET") {
      return route.fulfill({ json: { user, session: { userId: user.id } }, headers: {
        "Access-Control-Allow-Origin": origin.origin, "Access-Control-Allow-Credentials": "true",
      } });
    }
    if (url.origin !== origin.origin) return route.abort();
    if (url.pathname === "/api/credits") return route.fulfill({ json: { balance: 100 } });
    if (url.pathname === "/api/uploads/presign" && request.method() === "POST") {
      presigns.push(request);
      const object = new URL(`/media/refs/${user.id}/${presigns.length}.jpg`, origin).href;
      return route.fulfill({ json: { mode: "r2", uploadUrl: object, url: object } });
    }
    if (url.pathname.startsWith(`/media/refs/${user.id}/`) && request.method() === "PUT") {
      uploads.push(request);
      return route.fulfill({ status: 201 });
    }
    if (url.pathname === "/api/packs" && request.method() === "POST") {
      generations.push(request);
      return route.fulfill({ status: 402, json: { code: "INSUFFICIENT_CREDITS" } });
    }
    return request.method() === "GET" ? route.continue() : route.abort();
  });
  await page.goto(new URL("/studio", origin).href);
  await page.getByRole("link", { name: /^(Credits:\s*|当前余额：\s*)100$/ }).waitFor();
  const generate = page.getByRole("button", { name: /Generate HD Pack|一键生成高清表情包/ });
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 2;
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await Promise.all([
    page.waitForResponse(response => response.request().method() === "PUT" && response.url().endsWith("/2.jpg")),
    page.locator('input[type="file"]').setInputFiles(["first.png", "second.png"].map(name => ({
      name, mimeType: "image/png", buffer: Buffer.from(png, "base64"),
    }))),
  ]);
  await generate.click();
  await page.getByText(/Not enough credits \(needs|积分不足（需要/).waitFor();
  assert.equal(presigns.length, 2);
  assert.equal(uploads.length, 2);
  assert.equal(generations.length, 1);
  assert.deepEqual(generations[0].postDataJSON().references.map(ref => ref.url), uploads.map(upload => upload.url()));
  for (const request of [...presigns, ...generations]) assert.equal(await request.headerValue("x-turnstile-token"), null);
  assert.deepEqual(challenges, []);
  assert.equal(await page.getByRole("dialog").count(), 0);
});

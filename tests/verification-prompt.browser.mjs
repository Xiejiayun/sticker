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
        await page.setViewportSize({ width: 320, height: 640 });
        assert.equal(await frame.evaluate((element, previous) => element === previous, mountedFrame), true);
        assert.ok(await panel.evaluate(element => element.scrollWidth <= element.clientWidth));
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

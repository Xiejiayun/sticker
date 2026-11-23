import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { compileFunction } from "node:vm";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";
import * as schema from "../src/db/schema.ts";
import { getAdvertisedSignupBonusCredits, getSignupBonusCredits } from "../src/config/pricing.ts";
import { checkTurnstile } from "../src/lib/turnstile.ts";
import { checkStudioMutation } from "../src/lib/studio-request.ts";
import * as media from "../src/lib/storage/media.ts";
import * as mail from "../src/lib/verification-email.ts";

const require = createRequire(import.meta.url);
const origin = "https://sticker.example";
const verifyApi = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const email = "tester@example.invalid";
const password = "fixture-password-only";
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

function load(file, dependencies) {
  const js = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  compileFunction(js, ["require", "module", "exports"])(id => dependencies[id] ?? require(id), mod, mod.exports);
  return mod.exports;
}

function configure(t, extra = {}) {
  const settings = { NODE_ENV: "test", NEXT_PUBLIC_TURNSTILE_SITE_KEY: "test-site", TURNSTILE_SECRET: "test-secret",
    BETTER_AUTH_URL: origin, BETTER_AUTH_SECRET: crypto.randomUUID(), AUTH_REQUIRE_VERIFIED_EMAIL: "true",
    RESEND_API_KEY: "test-only", AUTH_EMAIL_FROM: "verify@example.invalid", CREDITS_SIGNUP_BONUS: "20", ...extra };
  for (const [key, value] of Object.entries(settings)) {
    const old = process.env[key];
    process.env[key] = value;
    t.after(() => { if (old === undefined) delete process.env[key]; else process.env[key] = old; });
  }
}

test("static pages only advertise an explicitly configured signup amount", t => {
  configure(t);
  assert.equal(getAdvertisedSignupBonusCredits(), 20);
  process.env.CREDITS_SIGNUP_BONUS = "0";
  assert.equal(getAdvertisedSignupBonusCredits(), 0);
  delete process.env.CREDITS_SIGNUP_BONUS;
  assert.equal(getAdvertisedSignupBonusCredits(), null);
  assert.equal(getSignupBonusCredits(), 50);
});

test("Siteverify is opt-in, rejects partial configuration and requires a valid response bound to the trusted host and action", async t => {
  configure(t);
  const headers = new Headers({ "x-turnstile-token": "fixture", host: "wrong.example" });
  let reply = Response.json({ success: true, action: "login", hostname: "sticker.example" });
  const upstream = t.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(url, verifyApi);
    assert.equal(init.method, "POST");
    assert.deepEqual(Object.fromEntries(init.body), { secret: "test-secret", response: "fixture" });
    assert.ok(init.signal instanceof AbortSignal);
    if (!reply) throw new Error("offline");
    return reply;
  });
  assert.equal((await checkTurnstile(undefined, "login")).status, 403);
  assert.equal((await checkTurnstile(new Headers({ "x-turnstile-token": "a".repeat(2049) }), "login")).status, 403);
  assert.equal(upstream.mock.callCount(), 0);
  assert.equal(await checkTurnstile(headers, "login"), null);
  for (const [body, status] of [
    [{ success: true, action: "login", hostname: "wrong.example" }, 403],
    [{ success: true, action: "signup", hostname: "sticker.example" }, 403],
    [{ success: true }, 403], [{ success: false, "error-codes": ["timeout-or-duplicate"] }, 403],
    [{ success: false, "error-codes": ["invalid-input-secret"] }, 503],
  ]) {
    reply = Response.json(body);
    assert.equal((await checkTurnstile(headers, "login")).status, status);
  }
  for (const failure of [new Response("bad JSON"), new Response(null, { status: 502 }), null]) {
    reply = failure;
    assert.equal((await checkTurnstile(headers, "login")).status, 503);
  }
  const calls = upstream.mock.callCount();
  delete process.env.TURNSTILE_SECRET;
  assert.equal((await checkTurnstile(headers, "login")).status, 503);
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  assert.equal(await checkTurnstile(undefined, "login"), null);
  process.env.TURNSTILE_SECRET = "test-secret";
  assert.equal((await checkTurnstile(headers, "login")).status, 503);
  assert.equal(upstream.mock.callCount(), calls);
});

test("staged rollout: unmigrated wallets, purchases, holds and refunds keep working with verification off", async t => {
  configure(t, { AUTH_REQUIRE_VERIFIED_EMAIL: "false" });
  const pg = await PGlite.create();
  t.after(() => pg.close());
  const ddl = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema));
  await pg.exec(ddl.join(";\n"));
  await pg.exec(`alter table credit_wallets drop column signup_bonus_claimed;
    insert into "user" (id,name,email) values ('old','Old','old@example.invalid'), ('new','New','new@example.invalid'), ('pending','Pending','pending@example.invalid');
    insert into credit_wallets (user_id,balance) values ('old',7);`);
  const db = { ...schema, getDb: () => drizzle(pg, { schema }) };
  const credits = load("src/lib/credits.ts", { "@/db": db, "@/config/pricing": { getSignupBonusCredits }, "@/lib/verification-email": mail });
  assert.equal(await credits.getCreditBalance("old"), 7);
  assert.deepEqual(await credits.getCreditLedger("old"), []);
  assert.deepEqual(await Promise.all([credits.getCreditBalance("new"), credits.getCreditBalance("new")]), [20, 20]);
  assert.equal(await credits.holdCredits("new", 8, "local-pack"), 12);
  assert.equal(await credits.addCredits("new", 8, "REFUND", "local-pack"), 20);
  assert.equal(await credits.addCredits("new", 6, "PURCHASE", "local-order"), 26);
  assert.equal((await credits.getCreditLedger("new")).filter(item => item.type === "SIGNUP_BONUS").length, 1);
  process.env.AUTH_REQUIRE_VERIFIED_EMAIL = "true";
  await assert.rejects(credits.getCreditBalance("pending"));
  await pg.exec(read("drizzle/20261123_verified_signup_bonus.sql"));
  await pg.exec(read("drizzle/20261123_verified_signup_bonus.sql"));
  assert.equal(await credits.getCreditBalance("new"), 26);
  assert.equal(await credits.getCreditBalance("pending"), 0);
  assert.equal(await credits.addCredits("pending", 8, "PURCHASE", "pending-order"), 8);
  process.env.AUTH_REQUIRE_VERIFIED_EMAIL = "false";
  assert.equal(await credits.getCreditBalance("pending"), 28);
  assert.equal(await credits.getCreditBalance("pending"), 28);
});

test("actual Better Auth routes and Postgres wallet: no free credits before verification, no duplicate on retry", async t => {
  configure(t);
  const pg = await PGlite.create();
  t.after(() => pg.close());
  const ddl = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema));
  await pg.exec(ddl.join(";\n"));
  await pg.exec(`alter table credit_wallets drop column signup_bonus_claimed;
    insert into "user" (id,name,email) values ('legacy','Old','legacy@example.invalid');
    insert into credit_wallets (user_id,balance) values ('legacy',7);`);
  await pg.exec(read("drizzle/20261123_verified_signup_bonus.sql"));
  const db = { ...schema, getDb: () => drizzle(pg, { schema }) };
  const credits = load("src/lib/credits.ts", { "@/db": db, "@/config/pricing": { getSignupBonusCredits }, "@/lib/verification-email": mail });
  const auth = load("src/lib/auth.ts", { "@/db": db, "@/db/schema": schema, "@/lib/credits": credits,
    "@/lib/turnstile": { checkTurnstile }, "@/lib/verification-email": mail }).getAuth();
  const used = new Set();
  const inbox = [];
  const token = action => `${action}:${crypto.randomUUID()}`;
  let rejectMail = false;
  t.mock.method(globalThis, "fetch", async (url, init) => {
    if (url === verifyApi) {
      const value = init.body.get("response");
      const duplicate = used.has(value);
      used.add(value);
      return Response.json({ success: !duplicate, action: value.split(":")[0], hostname: "sticker.example" });
    }
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(init.headers.Authorization, "Bearer test-only");
    const message = JSON.parse(init.body);
    assert.deepEqual(message.to, [email]);
    assert.equal(message.from, process.env.AUTH_EMAIL_FROM);
    if (rejectMail) return new Response(null, { status: 503 });
    inbox.push(message.text.match(/https:\/\/\S+/)[0]);
    return Response.json({ id: "local-test-mail" });
  });
  const post = (path, body, proof) => auth.handler(new Request(`${origin}/api/auth/${path}`, {
    method: "POST", headers: { "content-type": "application/json", origin, ...(proof && { "x-turnstile-token": proof }) }, body: JSON.stringify(body),
  }));
  const signup = { email, password, name: "Tester", callbackURL: "/auth?verified=1" };
  for (const [path, data] of [["sign-up/email", signup], ["sign-in/email", { email, password }], ["sign-in/social", { provider: "google" }], ["send-verification-email", { email }]]) {
    const response = await post(path, data);
    assert.equal((await response.json()).code, "TURNSTILE_REJECTED", path);
    assert.equal(response.status, 403);
  }
  assert.equal(inbox.length, 0);
  const proof = token("signup");
  const registered = await post("sign-up/email", signup, proof);
  const data = await registered.json();
  assert.equal(registered.status, 200, JSON.stringify(data));
  assert.equal(data.token, null);
  assert.equal(data.user.emailVerified, false);
  assert.equal(inbox.length, 1);
  assert.equal((await post("sign-up/email", signup, proof)).status, 403);
  const id = data.user.id;
  const balance = () => credits.getCreditBalance(id);
  const grants = async () => (await credits.getCreditLedger(id)).filter(entry => entry.type === "SIGNUP_BONUS");
  assert.equal(await balance(), 0);
  assert.deepEqual(await grants(), []);
  assert.equal(await credits.holdCredits(id, 10, "unverified"), null);
  assert.equal(await credits.addCredits(id, 8, "PURCHASE", "order"), 8);
  const unverified = await post("sign-in/email", { email, password }, token("login"));
  assert.equal((await unverified.json()).code, "EMAIL_NOT_VERIFIED");
  const resend = () => post("send-verification-email", { email, callbackURL: "/auth?verified=1" }, token("resend"));
  assert.equal((await resend()).status, 200);
  assert.equal(inbox.length, 2);
  const link = new URL(inbox[1]);
  assert.equal(link.origin, origin);
  assert.equal(link.searchParams.get("callbackURL"), "/auth?verified=1");
  const verified = await auth.handler(new Request(link));
  assert.equal(new URL(verified.headers.get("location"), origin).pathname, "/auth");
  await auth.handler(new Request(link));
  assert.deepEqual(await Promise.all(Array.from({ length: 4 }, balance)), [28, 28, 28, 28]);
  assert.deepEqual((await grants()).map(entry => entry.delta), [20]);
  assert.ok((await (await post("sign-in/email", { email, password }, token("login"))).json()).token);
  assert.equal(await credits.getCreditBalance("legacy"), 7);
  assert.deepEqual(await credits.getCreditLedger("legacy"), []);

  await pg.exec(`insert into "user" (id,name,email,email_verified) values ('race','New','race@example.invalid',true)`);
  assert.deepEqual(await Promise.all(Array.from({ length: 5 }, () => credits.getCreditBalance("race"))), [20,20,20,20,20]);
  assert.equal((await credits.getCreditLedger("race")).length, 1);
  process.env.CREDITS_SIGNUP_BONUS = "0";
  await pg.exec(`insert into "user" (id,name,email,email_verified) values ('zero','Zero','zero@example.invalid',true)`);
  assert.equal(await credits.getCreditBalance("zero"), 0);
  process.env.CREDITS_SIGNUP_BONUS = "20";
  assert.equal(await credits.getCreditBalance("zero"), 0);
  assert.deepEqual(await credits.getCreditLedger("zero"), []);

  await pg.exec(`insert into "user" (id,name,email,email_verified) values ('retry','Retry','retry@example.invalid',true);
    alter table credit_ledger add constraint temporary_write_failure check (user_id <> 'retry');`);
  await assert.rejects(credits.getCreditBalance("retry"));
  assert.deepEqual((await pg.query("select balance, signup_bonus_claimed from credit_wallets where user_id = 'retry'")).rows,
    [{ balance: 0, signup_bonus_claimed: false }]);
  await pg.exec("alter table credit_ledger drop constraint temporary_write_failure");
  assert.equal(await credits.getCreditBalance("retry"), 20);
  assert.equal((await credits.getCreditLedger("retry")).length, 1);

  rejectMail = true;
  await assert.rejects(mail.sendVerificationEmail({ user: { email }, url: link.href }), /provider returned HTTP 503/);
  delete process.env.RESEND_API_KEY;
  assert.equal((await post("sign-up/email", signup, token("signup"))).status, 503);
  process.env.AUTH_REQUIRE_VERIFIED_EMAIL = "false";
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  delete process.env.TURNSTILE_SECRET;
  const originalFlow = load("src/lib/auth.ts", { "@/db": db, "@/db/schema": schema, "@/lib/credits": credits,
    "@/lib/turnstile": { checkTurnstile }, "@/lib/verification-email": mail }).getAuth();
  const optout = await originalFlow.handler(new Request(`${origin}/api/auth/sign-up/email`, {
    method: "POST", headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ ...signup, email: "optout@example.invalid" }),
  }));
  const original = await optout.json();
  assert.ok(original.token);
  assert.equal(await credits.getCreditBalance(original.user.id), 20);
  assert.equal(inbox.length, 2);
});

test("upload presign signs each valid image for the session owner without a captcha", async t => {
  configure(t);
  let session = null;
  const env = { STICKER_IMAGES: {}, R2_SIGNING_SECRET: crypto.randomUUID(), NEXT_PUBLIC_APP_URL: origin };
  const storage = load("src/lib/r2.ts", {
    "@opennextjs/cloudflare": { getCloudflareContext: () => ({ env }) }, "./storage/media": media,
  });
  const signer = t.mock.method(storage, "createPresignedUploadUrl");
  const route = load("src/app/api/uploads/presign/route.ts", {
    "@/lib/auth": { getServerSession: () => session }, "@/lib/studio-request": { checkStudioMutation }, "@/lib/r2": storage,
  });
  const request = (body = {}, headers = {}) => new Request(`${origin}/api/uploads/presign`, {
    method: "POST", headers: { "content-type": "application/json; charset=utf-8", origin, ...headers },
    body: JSON.stringify({ contentType: "image/jpeg", fileSize: 20, ...body }),
  });
  assert.equal((await route.POST(request())).status, 401);
  session = { user: { id: "tester" } };
  assert.equal((await route.POST(request({}, { origin: "https://other.invalid" }))).status, 403);
  assert.equal((await route.POST(request({}, { "content-type": "text/plain" }))).status, 415);
  for (const body of [{ contentType: "image/svg+xml" }, { fileSize: 0 }, { fileSize: 10 * 1024 * 1024 + 1 }]) {
    assert.equal((await route.POST(request(body))).status, 400);
  }
  assert.equal(signer.mock.callCount(), 0);
  const urls = new Set();
  for (const contentType of ["image/jpeg", "image/png"]) {
    const response = await route.POST(request({ contentType, userId: "someone-else" }));
    assert.equal(response.status, 200);
    const { url, uploadUrl } = await response.json();
    assert.ok(media.ownedReference(url, session.user.id, origin));
    const signed = new URL(uploadUrl);
    assert.equal(signed.pathname, new URL(url).pathname);
    assert.equal(signed.searchParams.get("type"), contentType);
    assert.equal(signed.searchParams.get("size"), "20");
    assert.ok(await media.verifyImageUrl(signed, "PUT", env.R2_SIGNING_SECRET));
    urls.add(url);
  }
  assert.equal(urls.size, 2);
  delete env.STICKER_IMAGES;
  assert.equal((await route.POST(request())).status, 503);
  assert.equal(signer.mock.callCount(), 2);
});

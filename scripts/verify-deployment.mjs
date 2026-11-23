import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = process.env.NEXT_PUBLIC_APP_URL || 'https://sticker.jeremyxie.com';
const buildId = (await readFile('.next/BUILD_ID', 'utf8')).trim();
let count = 0;

async function check(route, expected = 200, validate = () => {}, options = {}) {
  // Read-only retries allow the new version and its assets to propagate.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(new URL(route, base), {
        redirect: 'manual', signal: AbortSignal.timeout(20000), ...options,
      });
      const bytes = Buffer.from(await response.arrayBuffer());
      assert.equal(response.status, expected, `${route}: HTTP ${response.status}`);
      validate(response, bytes.toString('utf8'), bytes);
      count++;
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

for (const locale of ['zh', 'en']) {
  for (const route of ['/', '/studio', '/packs', '/packs/view', '/pricing', '/auth']) {
    await check(route, 200, (response, body) => {
      assert.equal(response.headers.get('x-sticker-rendering'), 'static');
      assert.equal(response.headers.get('x-sticker-locale'), locale);
      assert.ok(body.includes(buildId), `${route}: old build is still being served`);
      assert.ok(body.includes('brand-icon.svg'), `${route}: missing brand icon`);
      if (locale === 'en' && route === '/auth' && process.env.GOOGLE_AUTH_ENABLED === 'true') {
        assert.ok(body.includes('Continue with Google'), 'Google sign-in button missing');
      }
    }, { headers: { Cookie: `NEXT_LOCALE=${locale}` } });
  }
}
await check('/zh/studio', 307, (response) => {
  assert.equal(new URL(response.headers.get('location'), base).pathname, '/studio');
  assert.match(response.headers.get('set-cookie') || '', /NEXT_LOCALE=zh/);
});
for (const file of ['brand-icon.svg', 'favicon.ico', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'site.webmanifest']) {
  const expected = await readFile(`public/${file}`);
  await check(`/${file}`, 200, (_, __, bytes) => assert.ok(bytes.equals(expected), `${file}: deployed asset differs`));
}
await check('/studio?_rsc=deployment-check', 200, (response, body) => {
  assert.match(response.headers.get('content-type'), /text\/x-component/);
  assert.ok(body.length > 100);
}, { headers: { RSC: '1', Cookie: 'NEXT_LOCALE=zh' } });
await check('/api/health', 200, (_, body) => {
  const health = JSON.parse(body);
  assert.equal(health.ok, true);
  assert.equal(health.config.database, true);
  assert.equal(health.config.r2, true);
  assert.equal(health.config.aiProvider, 'openai');
});
await check('/api/auth/get-session', 200, (_, body) => assert.equal(JSON.parse(body), null));
if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()) {
  await check('/api/auth/sign-in/email', 403, (_, body) => {
    assert.equal(JSON.parse(body).code, 'TURNSTILE_REJECTED', 'Expected the Turnstile gate, not another 403');
  }, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: new URL(base).origin },
    body: JSON.stringify({ email: 'release-check@example.invalid', password: 'Not-A-User-Password' }) });
}
for (const route of ['/api/packs', '/api/credits', '/api/packs/deployment-check']) await check(route, 401);
for (const route of ['/api/uploads/presign', '/api/packs']) {
  await check(route, 401, (_, body) => assert.equal(JSON.parse(body).error, 'Unauthorized'), {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: new URL(base).origin }, body: '{}',
  });
}
console.log(`Passed ${count} production checks for build ${buildId}. No images generated or credits charged.`);

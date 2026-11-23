import test from 'node:test';
import assert from 'node:assert/strict';
import { activeVersion, checkCandidate, checkConfig, deployedCommit, receiptVersion } from '../scripts/worker-release.mjs';

const previousId = 'aaaaaaaa-1111-2222-3333-444444444444';
const nextId = 'bbbbbbbb-1111-2222-3333-444444444444';
const baseline = '1'.repeat(40);
const commit = '2'.repeat(40);
const runtime = [['ASSETS', 'assets'], ['STICKER_IMAGES', 'r2_bucket'], ['R2_SIGNING_SECRET', 'secret_text'], ['DATABASE_URL', 'secret_text']];
const secret = ['TURNSTILE_SECRET', 'secret_text'];
function version(id, sha, bindings) {
  return { id, annotations: { 'workers/message': `github-main-${sha}` }, resources: { bindings: bindings.map(([name, type]) => ({ name, type })) } };
}
const previous = version(previousId, baseline, runtime);
const candidate = version(nextId, commit, [...runtime, secret]);

test('requires a single live version at 100%, never the newest uploaded version', () => {
  const traffic = { version_id: previousId, percentage: 100 };
  assert.equal(activeVersion({ versions: [traffic] }), previousId);
  for (const versions of [[], [traffic, { version_id: nextId, percentage: 0 }], [{ ...traffic, percentage: 99 }], [{ ...traffic, version_id: 'latest' }]]) {
    assert.throws(() => activeVersion({ versions }), /100%/);
  }
});

test('compares the live commit to this build, blocking accumulated infrastructure changes and unknown history', () => {
  assert.equal(deployedCommit(previous), baseline);
  assert.throws(() => deployedCommit({ annotations: { 'workers/message': 'manual' } }));
  const calls = [];
  checkConfig(baseline, commit, args => { calls.push(args); return 0; });
  assert.deepEqual(calls[0], ['merge-base', '--is-ancestor', baseline, commit]);
  assert.deepEqual(calls[1], ['diff', '--quiet', baseline, commit, '--', 'wrangler.jsonc', 'wrangler.json', 'wrangler.toml']);
  assert.throws(() => checkConfig(baseline, commit, () => 128), /ancestor/);
  assert.throws(() => checkConfig(baseline, commit, args => args[0] === 'diff' ? 1 : 0), /full release/);
});

test('selects only this run’s unique machine-readable receipt for the expected Worker', () => {
  const event = { type: 'version-upload', worker_name: 'sticker-studio', version_id: nextId };
  const read = lines => receiptVersion(lines.map(line => JSON.stringify(line)).join('\n') + '\n', 'version-upload');
  assert.equal(read([{ type: 'log' }, event]), nextId);
  for (const lines of [[], [event, event], [{ ...event, type: 'deploy' }], [{ ...event, worker_name: 'other' }], [{ ...event, version_id: 'latest' }]]) {
    assert.throws(() => read(lines));
  }
  assert.throws(() => receiptVersion('not-json', 'version-upload'));
  assert.equal(receiptVersion(JSON.stringify({ ...event, type: 'deploy' }), 'deploy'), nextId);
});

test('requires matching build, all previous bindings, assets, and paired Turnstile keys before promotion', () => {
  const check = (bindings, site = 'public-key') => checkCandidate(version(nextId, commit, bindings), previous, commit, site, true);
  assert.doesNotThrow(() => checkCandidate(candidate, previous, commit, 'public-key', true));
  assert.doesNotThrow(() => check(runtime, ''));
  assert.throws(() => check(runtime), /TURNSTILE_SECRET/);
  assert.throws(() => check([...runtime, secret], ''), /no public site key/);
  assert.throws(() => check([...runtime, ['TURNSTILE_SECRET', 'plain_text']]), /TURNSTILE_SECRET/);
  for (const [missing] of runtime) assert.throws(() => check([...runtime.filter(([name]) => name !== missing), secret]), new RegExp(missing));
  assert.throws(() => checkCandidate(candidate, previous, baseline, 'public-key', true), /annotation/);
});

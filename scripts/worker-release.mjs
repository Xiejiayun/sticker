import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { appendFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const worker = 'sticker-studio';
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;

export function activeVersion(deployment) {
  const versions = deployment?.versions;
  if (versions?.length !== 1 || versions[0].percentage !== 100 || !uuid.test(versions[0].version_id)) {
    throw new Error('Expected exactly one production version at 100%; inspect traffic before releasing.');
  }
  return versions[0].version_id;
}

export function deployedCommit(version) {
  const match = /^github-main-([0-9a-f]{40})$/.exec(version.annotations?.['workers/message']);
  if (!match) throw new Error('Active version has no trusted github-main commit; review infrastructure before a full release.');
  return match[1];
}

export function checkConfig(baseline, target, git) {
  if (git(['merge-base', '--is-ancestor', baseline, target]) !== 0) {
    throw new Error('Live commit is missing or is not an ancestor of this build; refusing a stale or unknown release.');
  }
  if (git(['diff', '--quiet', baseline, target, '--', 'wrangler.jsonc', 'wrangler.json', 'wrangler.toml']) !== 0) {
    throw new Error('Wrangler configuration differs from the live commit; review changes and dispatch a full release.');
  }
}

export function receiptVersion(jsonl, event) {
  let records;
  try { records = jsonl.trim().split('\n').map(line => JSON.parse(line)).filter(record => record.type === event); }
  catch { throw new Error('Invalid Wrangler release receipt.'); }
  if (records.length !== 1 || records[0].worker_name !== worker || !uuid.test(records[0].version_id)) {
    throw new Error('No unique version ID for the expected Worker in this release receipt.');
  }
  return records[0].version_id;
}

function bindings(version) {
  if (!Array.isArray(version.resources?.bindings)) throw new Error('Version binding metadata unavailable.');
  return new Map(version.resources.bindings.map(binding => [binding.name, binding.type]));
}

export function checkCandidate(candidate, previous, commit, siteKey, routine) {
  if (deployedCommit(candidate) !== commit) throw new Error('Version annotation does not identify this build.');
  const required = routine ? bindings(previous) : new Map();
  const actual = bindings(candidate);
  for (const [name, type] of [['R2_SIGNING_SECRET', 'secret_text'], ['STICKER_IMAGES', 'r2_bucket'], ['ASSETS', 'assets']]) {
    required.set(name, type);
  }
  if (siteKey?.trim()) required.set('TURNSTILE_SECRET', 'secret_text');
  else if (actual.has('TURNSTILE_SECRET')) throw new Error('Turnstile secret exists but the build has no public site key.');
  for (const [name, type] of required) {
    if (actual.get(name) !== type) throw new Error(`Missing or mistyped Worker binding: ${name}.`);
  }
}

function run(command, args, { capture = false, env = process.env } = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', env, stdio: ['ignore', capture ? 'pipe' : 'inherit', 'inherit'] });
  if (result.status !== 0) throw new Error(`Release command failed: ${command} ${args.slice(0, 3).join(' ')}`);
  return result.stdout;
}

function wrangler(args, capture = false) {
  const output = run(process.execPath, ['node_modules/wrangler/bin/wrangler.js', ...args, '--config', 'wrangler.jsonc', '--name', worker], { capture });
  if (capture) {
    try { return JSON.parse(output); } catch { throw new Error('Wrangler returned invalid metadata; not printing its contents.'); }
  }
}

function live() { return activeVersion(wrangler(['deployments', 'status', '--json'], true)); }
function view(versionId) {
  const version = wrangler(['versions', 'view', versionId, '--json'], true);
  if (version.id !== versionId) throw new Error('Worker version identity mismatch.');
  return version;
}

function note(message) {
  console.log(message);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${message}\n\n`);
}

function release(mode) {
  const commit = process.env.GITHUB_SHA;
  if (!['version', 'full'].includes(mode) || process.env.GITHUB_REF !== 'refs/heads/main' ||
      !/^[0-9a-f]{40}$/.test(commit) || !process.env.CLOUDFLARE_API_TOKEN ||
      run('git', ['rev-parse', 'HEAD'], { capture: true }).trim() !== commit) throw new Error('Invalid release context or missing deployment token.');
  if (mode === 'full' && (process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || process.env.FULL_RELEASE_CONFIRM !== worker)) {
    throw new Error('Full deploy requires a confirmed manual dispatch.');
  }
  const previousId = live();
  note(`Previous live version / recovery target: ${previousId} (100%).`);
  const previous = view(previousId);
  const routine = mode === 'version';
  if (routine) checkConfig(deployedCommit(previous), commit, args => spawnSync('git', args).status);
  const receipt = join(process.env.RUNNER_TEMP || tmpdir(), `worker-release-${randomUUID()}.jsonl`);
  try {
    if (live() !== previousId) throw new Error('Production moved during preflight; refusing release.');
    run('npm', ['run', routine ? 'cf:upload' : 'cf:deploy', '--', '--', '--config', 'wrangler.jsonc', '--name', worker,
      '--keep-vars', '--message', `github-main-${commit}`], { env: { ...process.env, WRANGLER_OUTPUT_FILE_PATH: receipt } });
    const versionId = receiptVersion(readFileSync(receipt, 'utf8'), routine ? 'version-upload' : 'deploy');
    note(`This run's ${routine ? 'uploaded' : 'deployed'} version: ${versionId}; commit: ${commit}.`);
    checkCandidate(view(versionId), previous, commit, process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY, routine);
    if (routine) {
      if (live() !== previousId) throw new Error('Production moved after upload; not promoting this version.');
      wrangler(['versions', 'deploy', `${versionId}@100%`, '--yes']);
    }
    if (live() !== versionId) throw new Error('Cloudflare does not report the expected version at 100%.');
    note(`Confirmed live at 100%: ${versionId}.`);
  } finally { rmSync(receipt, { force: true }); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { release(process.argv[2]); } catch (error) { console.error(error.message); process.exitCode = 1; }
}

const { execFileSync, spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 16 * 1024 * 1024 });
const failures = new Set();
const checked = new Set();
const forbiddenExtension = /\.(png|jpe?g|gif|webp|svg|ico|bmp|avif|heic|heif|tiff?|jfif|zip|7z|rar|tar|gz|lnk|pem|key|p12|pfx|db|sqlite\d?)$/i;

function inspect(name, data, label) {
  const base = path.posix.basename(name);
  if ((base === '.env' || base.startsWith('.env.')) && base !== '.env.example') failures.add(`${label}: environment file`);
  if (forbiddenExtension.test(name)) failures.add(`${label}: image, archive or private data file`);
  if (/(^|\/)(node_modules|dist|\.aws|\.codex|\.agents)(\/|$)/.test(name)) failures.add(`${label}: generated or local directory`);
  if (/service[-_]?account.*\.json$/i.test(name)) failures.add(`${label}: service account file`);
  if (data.includes(0)) { failures.add(`${label}: binary file`); return; }
  const text = data.toString('utf8');
  const rules = [
    ['Google API key', /AIza[\w-]{30,}/],
    ['GitHub token', /(?:gh[pousr]_|github_pat_)[\w]{30,}/],
    ['AWS key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
    ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/],
    ['secret service key', /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/],
    ['embedded image', /data:image\//i],
    ['authenticated connection URL', /(?:https?|mysql|postgres|mongodb):\/\/[^\s/:]+:[^\s/@]+@/i],
  ];
  for (const [rule, pattern] of rules) if (pattern.test(text)) failures.add(`${label}: ${rule}`);
  for (const match of text.matchAll(/\b[A-Za-z0-9_.+%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g)) {
    if (!/@(?:example\.(?:com|org|net|invalid)|[\w.-]+\.invalid|users\.noreply\.github\.com)$/.test(match[0])) failures.add(`${label}: non-example email address`);
  }
  for (const match of text.matchAll(/\b(?:password|secret|apiKey)\s*:\s*['"]([^'"\r\n]+)['"]/gi)) {
    if (!/^(?:replace-me|demo-|test-|unit-test-)/.test(match[1])) failures.add(`${label}: hardcoded credential`);
  }
  if (base === '.env.example') {
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim() || line.trimStart().startsWith('#')) continue;
      const value = line.slice(line.indexOf('=') + 1);
      if (!/^(?:replace-me|demo-playloop(?:\.invalid)?|playloop_demo|0+|1:0+:web:demo|127\.0\.0\.1|localhost|3000|3306|https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?)$/.test(value)) failures.add(`${label}: non-dummy example configuration`);
    }
  }
}

const index = git('ls-files', '--stage', '-z').toString('utf8').split('\0').filter(Boolean);
for (const entry of index) {
  const [meta, name] = entry.split('\t');
  const [mode, oid] = meta.split(' ');
  if (mode !== '100644' && mode !== '100755') failures.add(`${name}: unexpected file type`);
  inspect(name, git('cat-file', 'blob', oid), name);
  checked.add(`${name}:${oid}`);
}
const hasHead = spawnSync('git', ['rev-parse', '--verify', '--quiet', 'HEAD'], { cwd: root }).status === 0;
if (hasHead) {
  for (const sha of git('rev-list', '--all').toString().trim().split('\n').filter(Boolean)) {
    for (const row of git('ls-tree', '-r', '-z', sha).toString('utf8').split('\0').filter(Boolean)) {
      const [meta, name] = row.split('\t');
      const [, type, oid] = meta.split(' ');
      if (type !== 'blob') { failures.add(`${name}: nested repository`); continue; }
      if (checked.has(`${name}:${oid}`)) continue;
      inspect(name, git('cat-file', 'blob', oid), `${sha.slice(0, 7)}:${name}`);
      checked.add(`${name}:${oid}`);
    }
  }
  for (const email of git('log', '--all', '--format=%ae%n%ce').toString().trim().split('\n')) {
    if (!email.endsWith('@users.noreply.github.com')) failures.add('Commit metadata contains a non-noreply email');
  }
}
const probes = ['.env', '.env.local', '.env.production', 'PlayLoop/.env', 'PlayLoop/.env.production', 'test.png', 'test.SVG', 'uploads/test.txt', 'node_modules/test.js'];
const ignored = new Set(git('check-ignore', '--no-index', ...probes).toString().trim().split(/\r?\n/));
for (const probe of probes) if (!ignored.has(probe)) failures.add(`Ignore rule missing for ${probe}`);
if (failures.size) {
  console.error([...failures].join('\n'));
  process.exitCode = 1;
} else console.log(`Publication checks passed (${index.length} staged files; history checked).`);

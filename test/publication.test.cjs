const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

function createFixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'playloop-publication-test-'));
  t.after(() => {
    assert.ok(path.resolve(root).startsWith(path.resolve(tmpdir()) + path.sep));
    assert.ok(path.basename(root).startsWith('playloop-publication-test-'));
    rmSync(root, { recursive: true, force: true });
  });
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  const check = () => spawnSync(process.execPath, ['scripts/check-publication.cjs'], { cwd: root, encoding: 'utf8' });
  mkdirSync(path.join(root, 'scripts'));
  copyFileSync(path.join(__dirname, '../scripts/check-publication.cjs'), path.join(root, 'scripts/check-publication.cjs'));
  copyFileSync(path.join(__dirname, '../.gitignore'), path.join(root, '.gitignore'));
  git('init', '-b', 'main');
  git('config', 'user.name', 'Demo');
  git('config', 'user.email', 'demo@users.noreply.github.com');
  git('config', 'commit.gpgsign', 'false');
  git('config', 'core.hooksPath', '.no-hooks');
  writeFileSync(path.join(root, '.env.example'), 'DB_PASSWORD=replace-me\n');
  git('add', '.');
  assert.equal(check().status, 0);
  return { root, git, check };
}

test('publication guard rejects forced environment/image files and retained secret history', (t) => {
  const { root, git, check } = createFixture(t);

  writeFileSync(path.join(root, '.env'), 'DB_PASSWORD=replace-me\n');
  git('add', '-f', '.env');
  assert.equal(check().status, 1);
  git('rm', '--cached', '.env');
  writeFileSync(path.join(root, 'image.PNG'), Buffer.from([0, 1, 2, 3]));
  git('add', '-f', 'image.PNG');
  assert.equal(check().status, 1);
  git('rm', '--cached', 'image.PNG');
  assert.equal(check().status, 0);

  git('add', '-f', '.env');
  git('commit', '-m', 'Test fixture with an environment file');
  git('rm', '--cached', '.env');
  git('commit', '-m', 'Remove the environment file');
  const historyResult = check();
  assert.equal(historyResult.status, 1);
  assert.match(historyResult.stderr, /environment file/);
});

test('publication guard checks untracked, unstaged and staged credentials without printing values', (t) => {
  const { root, git, check } = createFixture(t);
  const filename = path.join(root, 'config.js');
  const credential = ['private', 'fixture', 'value'].join('-');
  const name = ['DB', 'PASSWORD'].join('_');
  const sensitiveContent = `const ${name} = ${JSON.stringify(credential)};\n`;
  const safeContent = 'const configured = false;\n';
  const assertRejected = () => {
    const result = check();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /config\.js: hardcoded credential/);
    assert.ok(!result.stderr.includes(credential));
  };

  writeFileSync(filename, sensitiveContent);
  assertRejected(); // A new file has not been added to Git yet.
  writeFileSync(filename, safeContent);
  git('add', 'config.js');
  assert.equal(check().status, 0);
  writeFileSync(filename, sensitiveContent);
  assertRejected(); // The index is safe but the current edit is not.
  git('add', 'config.js');
  writeFileSync(filename, safeContent);
  assertRejected(); // Restoring the working copy must not hide staged secrets.
  git('add', 'config.js');
  assert.equal(check().status, 0);

  writeFileSync(path.join(root, '.env'), `${name}=${credential}\n`);
  assert.equal(check().status, 0); // An ignored local .env is not a publication file.

  writeFileSync(path.join(root, 'settings.txt'), `${name}=${credential}\n`);
  const unquotedResult = check();
  assert.equal(unquotedResult.status, 1);
  assert.match(unquotedResult.stderr, /settings\.txt: hardcoded environment credential/);
  assert.ok(!unquotedResult.stderr.includes(credential));
});

test('publication guard rejects personal contact details in untracked documents', (t) => {
  const { root, check } = createFixture(t);
  const contact = ['person', 'mail.example.com'].join('@');
  writeFileSync(path.join(root, 'notes.md'), `Contact: ${contact}\n`);
  const result = check();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /notes\.md: non-example email address/);
  assert.ok(!result.stderr.includes(contact));
});

test('publication guard checks commit messages even when file contents are safe', (t) => {
  const { git, check } = createFixture(t);
  const token = 'ghp_' + 'a'.repeat(36);
  git('commit', '-m', `Fixture message containing ${token}`);
  const result = check();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /commit metadata: GitHub token/);
  assert.ok(!result.stderr.includes(token));
});

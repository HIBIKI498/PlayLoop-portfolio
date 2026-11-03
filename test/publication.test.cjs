const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

test('publication guard rejects forced environment/image files and retained secret history', (t) => {
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

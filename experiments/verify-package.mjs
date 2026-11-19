/** Verify the artifact that consumers install, including npm's executable link. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
assert.equal(pkg.name, '@link-foundation/gh-content-fetch');
assert.equal(pkg.publishConfig.access, 'public');
assert.equal(pkg.bin['gh-content-fetch'], 'src/gh-content-fetch.mjs');
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
assert.equal(lock.name, pkg.name);
assert.equal(lock.packages[''].name, pkg.name);

const directory = mkdtempSync(join(tmpdir(), 'gh-gist-package-'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const run = (command, args, cwd) =>
  execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: 60000,
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

try {
  const [artifact] = JSON.parse(
    run(
      npm,
      ['pack', '--ignore-scripts', '--json', '--pack-destination', directory],
      root
    )
  );
  assert.equal(artifact.name, pkg.name);
  writeFileSync(join(directory, 'package.json'), '{"private":true}');
  run(
    npm,
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      join(directory, artifact.filename),
    ],
    directory
  );
  const bin = join(
    directory,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'gh-content-fetch.cmd' : 'gh-content-fetch'
  );
  assert.equal(run(bin, ['--version'], directory).trim(), pkg.version);
  const help = run(bin, ['--help'], directory);
  assert.match(help, /--token/);
  assert.match(help, /--output/);
  assert.match(help, /gh-content-fetch/);
  console.log(
    `Verified ${pkg.name}@${pkg.version}: packed install, bin help and version`
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}

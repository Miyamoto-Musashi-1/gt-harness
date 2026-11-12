import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), 'gt-harness-package-'));
const env = { ...process.env, npm_config_cache: join(temporary, '.npm-cache') };

try {
  // Pack with the real prepack hook, then install outside the source tree.
  const output = execFileSync(
    'npm',
    ['--silent', 'pack', '--json', '--pack-destination', temporary],
    { cwd: root, encoding: 'utf8', env },
  );
  const [packed] = JSON.parse(output);
  const files = packed.files.map(({ path }) => path).sort();
  assert.deepEqual(files, [
    'LICENSE',
    'README.md',
    'dist/cli/index.js',
    'dist/cli/run.js',
    'dist/providers/answer.js',
    'dist/providers/openai.js',
    'docs/architecture.md',
    'docs/learning/pr-01.md',
    'docs/learning/pr-02.md',
    'docs/roadmap.md',
    'package.json',
  ]);

  execFileSync(
    'npm',
    [
      'install',
      '--prefix',
      temporary,
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--package-lock=false',
      join(temporary, packed.filename),
    ],
    { encoding: 'utf8', stdio: 'pipe', env },
  );

  const binary = join(temporary, 'node_modules/.bin/gt-harness');
  const manifest = JSON.parse(
    readFileSync(join(dirname(binary), '../gt-harness/package.json'), 'utf8'),
  );
  assert.equal(manifest.private, true, 'Publication must remain disabled');
  assert.deepEqual(manifest.exports, {}, 'Internal modules must stay private');

  for (const args of [
    [],
    ['--help'],
    ['--version'],
    ['--bad'],
    ['--help', '--version'],
  ]) {
    // Execute the installed binary directly: this also checks its shebang and permissions.
    const result = spawnSync(binary, args, {
      cwd: temporary,
      encoding: 'utf8',
    });
    assert.ifError(result.error);
    const invalid = args.includes('--bad') || args.length > 1;
    assert.equal(result.status, invalid ? 2 : 0);
    if (invalid) {
      assert.equal(result.stdout, '');
      assert.match(
        result.stderr,
        /Invalid arguments:.*\nRun gt-harness --help/,
      );
    } else {
      assert.equal(result.stderr, '');
      if (args[0] === '--version') {
        assert.equal(result.stdout, `${manifest.version}\n`);
      } else {
        assert.match(result.stdout, /Usage: gt-harness/);
      }
    }
  }

  const ask = spawnSync(binary, ['ask', 'Explain argv.'], {
    cwd: temporary,
    encoding: 'utf8',
    env: { ...process.env, OPENAI_API_KEY: '', OPENAI_MODEL: '' },
  });
  assert.ifError(ask.error);
  assert.equal(ask.status, 1);
  assert.equal(ask.stdout, '');
  assert.match(ask.stderr, /Set OPENAI_API_KEY/);

  console.log(
    'Package contents and installed CLI verified in an isolated directory.',
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

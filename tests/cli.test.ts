import { describe, expect, it } from 'vitest';
import { runCli } from '../src/cli/run.js';

describe('CLI contract', () => {
  it.each([{ args: [] }, { args: ['--help'] }])(
    'shows help for $args',
    ({ args }) => {
      const result = runCli(args, '0.1.0');
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toContain('Usage: gt-harness');
      expect(result.stdout).toContain('--version');
    },
  );

  it('uses the supplied package version', () => {
    expect(runCli(['--version'], '1.2.3')).toEqual({
      exitCode: 0,
      stdout: '1.2.3\n',
      stderr: '',
    });
  });

  it.each([
    { args: ['--unknown'] },
    { args: ['some-task'] },
    { args: ['--help', '--version'] },
    { args: ['--help', '--unknown'] },
    { args: ['--version', '--version'] },
    { args: [''] },
  ])('rejects invalid argv: $args', ({ args }) => {
    const result = runCli(args, '0.1.0');
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Invalid arguments:');
    expect(result.stderr).toContain('gt-harness --help');
  });
});

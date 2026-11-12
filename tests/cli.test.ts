import { describe, expect, it, vi } from 'vitest';
import { runCli } from '../src/cli/run.js';
import type { AnswerPrompt } from '../src/providers/answer.js';

const unexpectedRequest: AnswerPrompt = () => {
  throw new Error('This invocation must not request a model answer.');
};

describe('CLI contract', () => {
  it.each([{ args: [] }, { args: ['--help'] }])(
    'shows help for $args',
    async ({ args }) => {
      const result = await runCli(args, '0.1.0', unexpectedRequest);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toContain('Usage: gt-harness');
      expect(result.stdout).toContain('--version');
    },
  );

  it('uses the supplied package version', async () => {
    expect(await runCli(['--version'], '1.2.3', unexpectedRequest)).toEqual({
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
  ])('rejects invalid argv: $args', async ({ args }) => {
    const result = await runCli(args, '0.1.0', unexpectedRequest);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Invalid arguments:');
    expect(result.stderr).toContain('gt-harness --help');
  });

  it.each(
    [['ask'], ['ask', '   '], ['ask', 'two', 'arguments']].map((args) => ({
      args,
    })),
  )('rejects a malformed ask: $args', async ({ args }) => {
    expect(await runCli(args, '0.1.0', unexpectedRequest)).toEqual({
      exitCode: 2,
      stdout: '',
      stderr: 'Usage: gt-harness ask "<prompt>"\n',
    });
  });

  it('passes one prompt through unchanged and prints the answer', async () => {
    const answer = vi.fn<AnswerPrompt>().mockResolvedValue({
      ok: true,
      text: 'A scripted answer.',
    });
    const result = await runCli(['ask', '  Explain argv.  '], '0.1.0', answer);

    expect(answer).toHaveBeenCalledExactlyOnceWith('  Explain argv.  ');
    expect(result).toEqual({
      exitCode: 0,
      stdout: 'A scripted answer.\n',
      stderr: '',
    });
  });

  it('reports model failures on stderr with exit code 1', async () => {
    const result = await runCli(
      ['ask', 'Explain argv.'],
      '0.1.0',
      async () => ({
        ok: false,
        message: 'Provider unavailable.',
      }),
    );

    expect(result).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: 'Provider unavailable.\n',
    });
  });
});

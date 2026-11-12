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

    expect(answer).toHaveBeenCalledExactlyOnceWith(
      '  Explain argv.  ',
      expect.objectContaining({ onText: expect.any(Function) }),
    );
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

  it('writes chunks before completion and avoids printing the answer twice', async () => {
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const onText = vi.fn();
    const pending = runCli(
      ['ask', 'prompt'],
      '0.1.0',
      async (_, options) => {
        options.onText?.('Hello');
        await gate;
        options.onText?.(' world');
        return { ok: true, text: 'Hello world' };
      },
      { onText },
    );

    expect(onText).toHaveBeenCalledExactlyOnceWith('Hello');
    finish();
    expect(await pending).toEqual({ exitCode: 0, stdout: '\n', stderr: '' });
    expect(onText.mock.calls).toEqual([['Hello'], [' world']]);
  });

  it('preserves partial output and reports cancellation with exit code 130', async () => {
    const controller = new AbortController();
    const onText = vi.fn();
    const result = await runCli(
      ['ask', 'prompt'],
      '0.1.0',
      async (_, options) => {
        options.onText?.('Partial');
        controller.abort();
        return { ok: false, message: 'Request cancelled.' };
      },
      { onText, signal: controller.signal },
    );

    expect(onText).toHaveBeenCalledExactlyOnceWith('Partial');
    expect(result).toEqual({
      exitCode: 130,
      stdout: '\n',
      stderr: 'Request cancelled.\n',
    });
  });

  it('reports a failure after partial output without adding a second newline', async () => {
    const onText = vi.fn();
    const result = await runCli(
      ['ask', 'prompt'],
      '0.1.0',
      async (_, options) => {
        options.onText?.('Partial\n');
        return { ok: false, message: 'OpenAI did not complete the response.' };
      },
      { onText },
    );
    expect(result).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: 'OpenAI did not complete the response.\n',
    });
  });
});

import type { AnswerOptions, AnswerPrompt } from '../providers/answer.js';

const HELP = `Usage: gt-harness [--help | --version]
       gt-harness ask "<prompt>"

A coding-agent harness built step by step.

Commands:
  ask        Send one prompt to OpenAI (requires OPENAI_API_KEY and OPENAI_MODEL)

Options:
  --help     Show this help message
  --version  Show the installed version
`;

export type CliResult =
  | { exitCode: 0; stdout: string; stderr: '' }
  | { exitCode: 1 | 2 | 130; stdout: string; stderr: string };

export async function runCli(
  args: readonly string[],
  version: string,
  answerPrompt: AnswerPrompt,
  options: AnswerOptions = {},
): Promise<CliResult> {
  if (args.length === 0 || (args.length === 1 && args[0] === '--help')) {
    return { exitCode: 0, stdout: HELP, stderr: '' };
  }

  if (args.length === 1 && args[0] === '--version') {
    return { exitCode: 0, stdout: `${version}\n`, stderr: '' };
  }

  if (args[0] === 'ask') {
    const prompt = args[1];
    if (args.length !== 2 || !prompt?.trim()) {
      return {
        exitCode: 2,
        stdout: '',
        stderr: 'Usage: gt-harness ask "<prompt>"\n',
      };
    }

    let lastChunk = '';
    const answer = await answerPrompt(prompt, {
      ...options,
      onText: (chunk) => {
        if (chunk && options.onText) {
          options.onText(chunk);
          lastChunk = chunk;
        }
      },
    });
    const suffix = lastChunk && !lastChunk.endsWith('\n') ? '\n' : '';
    if (options.signal?.aborted) {
      return { exitCode: 130, stdout: suffix, stderr: 'Request cancelled.\n' };
    }
    if (!answer.ok) {
      return { exitCode: 1, stdout: suffix, stderr: `${answer.message}\n` };
    }
    return {
      exitCode: 0,
      stdout: lastChunk
        ? suffix
        : answer.text.endsWith('\n')
          ? answer.text
          : `${answer.text}\n`,
      stderr: '',
    };
  }

  return {
    exitCode: 2,
    stdout: '',
    stderr: `Invalid arguments: ${JSON.stringify(args)}\nRun gt-harness --help for usage.\n`,
  };
}

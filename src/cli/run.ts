const HELP = `Usage: gt-harness [--help | --version]

A coding-agent harness built step by step.

Options:
  --help     Show this help message
  --version  Show the installed version
`;

export type CliResult =
  | { exitCode: 0; stdout: string; stderr: '' }
  | { exitCode: 2; stdout: ''; stderr: string };

export function runCli(args: readonly string[], version: string): CliResult {
  if (args.length === 0 || (args.length === 1 && args[0] === '--help')) {
    return { exitCode: 0, stdout: HELP, stderr: '' };
  }

  if (args.length === 1 && args[0] === '--version') {
    return { exitCode: 0, stdout: `${version}\n`, stderr: '' };
  }

  return {
    exitCode: 2,
    stdout: '',
    stderr: `Invalid arguments: ${JSON.stringify(args)}\nRun gt-harness --help for usage.\n`,
  };
}

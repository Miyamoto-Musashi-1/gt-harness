# gt-harness

A coding-agent harness built from scratch, one small PR at a time.

The CLI can send a single prompt to OpenAI and print the model's answer.
Help, version, and development checks work without API credentials.
Publication is disabled with `private: true`.

## Setup

Use Node.js 22.13 or newer within the Node 22 release line, and pnpm 10.8.1.
macOS and Linux are the initial supported platforms.

```sh
nvm use
npm install --global pnpm@10.8.1
pnpm install --frozen-lockfile
pnpm dev --help
pnpm dev --version
```

Build and run the production entrypoint:

```sh
pnpm build
node dist/cli/index.js --help
node dist/cli/index.js --version
```

## CLI contract

Set `OPENAI_API_KEY` in your environment and choose a Responses API model your
project can access. Replace `your-model-id` with its model ID.

```sh
OPENAI_MODEL=your-model-id pnpm dev ask "Explain how CLI exit codes work."
```

| Arguments                                              | Output                         | Exit code |
| ------------------------------------------------------ | ------------------------------ | --------- |
| None or `--help`                                       | Usage on stdout                | 0         |
| `--version`                                            | Package version on stdout      | 0         |
| `ask "<prompt>"`                                       | Completed model text on stdout | 0         |
| `ask "<prompt>"` with configuration or request failure | Error on stderr                | 1         |
| Anything else, including combined flags                | Error and help hint on stderr  | 2         |

## Development checks

```sh
pnpm check
```

This runs type-checking, linting, formatting checks, unit tests, and an installed
package smoke test. The unit tests use scripted responses and need no network
access. The package test installs the tarball and its runtime dependencies from
the npm registry in a temporary directory, with install scripts disabled. It
verifies the package files and invokes the installed executable without API
credentials. Temporary files are removed afterward.

Use `pnpm test:watch` while changing behavior, and `pnpm format` to format files.
`pnpm build` compiles source only. `pnpm test:package` builds through the package's
`prepack` hook, so it also works before a manual build.

## How we deliver

Each branch contains one reviewable behavior change. Before coding, write its
acceptance criteria. After coding, run `pnpm check`, review the diff, and document
the design tradeoffs and evidence in the PR. AI can help implement and review;
the author remains responsible for correctness.

GitHub Actions checks pull requests and pushes to `main` on macOS and Linux.
Publishing will get a separate release PR with installation checks, versioning,
credential setup, and a rollback procedure. No publishing workflow exists yet.

- [Architecture decisions](docs/architecture.md)
- [Small-PR roadmap](docs/roadmap.md)
- [PR 1 lesson and exercise](docs/learning/pr-01.md)
- [PR 2 lesson and exercise](docs/learning/pr-02.md)

Licensed under MIT.

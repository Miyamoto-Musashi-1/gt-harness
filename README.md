# gt-harness

A coding-agent harness built from scratch, one small PR at a time.

The current slice is a CLI foundation: help, version, argument errors, and
automated checks. Model requests, file tools, and command execution come later.
No API key is needed yet. Publication is disabled with `private: true`.

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

| Arguments                               | Output                        | Exit code |
| --------------------------------------- | ----------------------------- | --------- |
| None or `--help`                        | Usage on stdout               | 0         |
| `--version`                             | Package version on stdout     | 0         |
| Anything else, including combined flags | Error and help hint on stderr | 2         |

## Development checks

```sh
pnpm check
```

This runs type-checking, linting, formatting checks, unit tests, and an installed
package smoke test. The package test packs the project, installs the tarball in a
temporary directory without network access or install scripts, verifies its files,
and invokes its executable. Temporary files are removed afterward.

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

Licensed under MIT.

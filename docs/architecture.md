# Architecture decision 001: a single package with explicit effects

Status: accepted for PR 1.

## Context

We are learning how a coding-agent harness works while keeping each change easy
to review. The first slice needs an installable CLI, not an agent framework.

## Decision

Use one TypeScript package, strict checking, ESM output, and Node.js 22.
Compile with TypeScript; no bundler is necessary for this slice.

The executable in `src/cli/index.ts` reads package metadata, passes arguments to
`runCli`, writes the returned output, and sets `process.exitCode`. It does not
force an immediate process exit, allowing output to drain normally.

`runCli` accepts arguments and the installed version, then returns an explicit
result. Its interface includes stdout, stderr, and the exit code. It performs no
I/O directly. Streaming output uses an injected callback. The result is a
discriminated union, so success and invalid usage have
different types. Package metadata is the single source of truth for the version.

Only the executable is public. An empty package `exports` map prevents supported
imports of internal modules. An explicit package file allowlist limits what ships.

## Consequences

CLI behavior can be tested without processes. A separate installed-package check
verifies the real process, package contents, executable permissions, and metadata
paths. Runtime dependencies are unnecessary today.

Avoid adding interfaces, inheritance, dependency injection containers, or empty
directories for future features. Introduce modules when they own real behavior.

As the project grows, the CLI will compose the agent loop, provider adapter,
tools, permission policy, and session storage. Model API and filesystem effects
will be injected at testable seams. The core loop will not depend on terminal
formatting or concrete provider SDK types.

Revisit this decision when a second consumer needs the runtime or a concrete
requirement demands a separate process. Scalability starts with clear ownership
and bounded work; distribution can follow measured needs.

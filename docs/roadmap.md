# Learning and delivery roadmap

Each row is a proposed PR. Split it further if it cannot be reviewed comfortably.
Specify the next slice's interfaces and acceptance criteria before implementing it.

| PR  | Deliverable                              | Concept                                       |
| --- | ---------------------------------------- | --------------------------------------------- |
| 1   | CLI foundation, CI, package verification | Pure logic, effects, reproducible builds      |
| 2   | One prompt and one OpenAI model answer   | Provider adapter, configuration, async errors |
| 3   | Streaming and cancellation               | Event streams, resource cleanup               |
| 4   | Read-only file tool and bounded loop     | Tool calling, validation, permissions, state  |
| 5   | Repository listing and search            | Context discovery, output limits              |
| 6   | Task fixtures and evaluation runner      | Behavioral quality versus code correctness    |
| 7   | Proposed edits and approval              | Trust, diff review, safe writes               |
| 8   | Restricted command execution             | Isolation, timeouts, process lifecycle        |
| 9   | Test-and-repair workflow                 | Feedback, failure recovery, stopping criteria |
| 10  | Saved sessions and resume                | Persistence, compatibility, recovery          |
| 11  | Context and usage budgets                | Token limits, truncation, compaction          |
| 12  | Public npm preview                       | Releases, installation, versioning, rollback  |

## Delivery loop

Explain the concept, define acceptance criteria, implement, verify, review, and
record the lesson. Merge one slice before starting the next. PR descriptions
record purpose, evidence, risk, and the relevant learning note.

Use deterministic model fixtures in CI once model calls exist. Live evaluations
will be opt-in and measure task success, latency, usage, and failure modes.
Introduce permission checks with the first tool and limits with the first loop.

## Topics to learn as capabilities arrive

- Model output and repository files are untrusted input; prompt injection can
  redirect an agent through content it reads.
- Approval is a policy decision. Sandboxing is an execution restriction. A path
  check or confirmation prompt alone does not isolate arbitrary commands.
- Retrying a model request and retrying a file write have different consequences.
  Learn idempotency before adding automatic retries around effects.
- Keep secrets out of version control, package artifacts, prompts, and traces.
- Unit tests check software behavior. Agent evaluations check whether realistic
  tasks succeed under bounded time and cost.

Defer web UI, multi-agent orchestration, MCP, vector databases, and distributed
execution until requirements justify them. Build the harness ourselves, using
the OpenAI SDK for model requests when PR 2 begins.

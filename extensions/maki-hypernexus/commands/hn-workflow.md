---
description: Start or inspect a HyperNexus workflow execution
argument-hint: <start <id>|list|executions>
---
Run one HyperNexus workflow operation for `$ARGUMENTS` against
`http://127.0.0.1:7778`:

- `list` — `GET /api/workflows`; report each workflow `id`, `name`,
  and `status`.
- `start <id>` — `POST /api/workflows/start` with `{"id":"<id>"}`;
  report the run status.
- `executions` — `GET /api/workflows/executions`; report recent runs
  and their step states.

Known workflow ids include `lint-test`, `autonomous-lifecycle`,
`full-build`, and `submodule-sync` (ids may evolve — prefer `list`
output over this text). If the kernel is unreachable, say so and
stop — never invent run state.

# HyperNexus hooks for Grok (by-convention)

Grok exposes **no hook API** (no SessionStart / PreToolUse surface), so
these scripts are the maximum possible through the Grok harness: they ship the
exact crush gate policy as runnable POSIX scripts plus a static session
bootstrap, and the installer copies them to `.agents/hooks/` for documentation,
manual runs, and forward-compatibility if Grok ever adds hooks.

| Script | Mirrors | Use |
|---|---|---|
| `hn-session.sh` | crush `hn-session.sh` | `sh .agents/hooks/hn-session.sh` at session start, or paste its context line |
| `hn-rbac.sh` | crush `hn-rbac.sh` | `echo '{"tool_input":{"command":"<cmd>"}}' \| sh .agents/hooks/hn-rbac.sh` before destructive shell work |
| `hn-pre-tool.sh` | crush `hn-pre-tool.sh` | allow-gate policy reference; exit 2 = deny |

Enforcement in Grok is by-convention: the RBAC deny-list and the
fail-open degradation contract are baked into the `hypernexus-ops` skill and
the `AGENTS.md` managed block, which Grok reads at chat start.

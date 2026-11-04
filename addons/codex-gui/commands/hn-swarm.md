# hn-swarm

Leader fan-out: enumerate all Codex GUI sessions, assign each ONE disjoint subtask via its thread, track roster (assigned/working/reported), collect `STATUS: DONE/BLOCKED` reports, verify and integrate. Max 8 workers, one message per worker per round. Usage: hn-swarm "goal" (leader splits it across sessions).
# /hn-summary — compact the session and persist the summary
Summarize this session (goal, key decisions, files changed, test results, next steps),
then persist it: `node addons/hax/hn.mjs handoff "<summary>"`.
Also store any non-obvious gotcha as its own fact via `hn-store` so vector search finds it later.

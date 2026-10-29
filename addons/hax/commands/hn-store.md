# /hn-store — persist to HyperNexus L2 memory
You are persisting a fact, decision, gotcha, or observation to durable cross-session memory.

Run (fill in the bracketed parts, keep tags tight):
```
node addons/hax/hn.mjs store "<title>" "<content — what happened, why it matters>" "tag1,tag2" [category]
```
Categories: `general` (default) | `fact` | `decision` | `gotcha` | `plan` | `observation`.
Verify with: `node addons/hax/hn.mjs fts "<keyword>" 3` — the item should appear.
Never store secrets (keys, tokens, passwords). If the kernel is unreachable, say so in one sentence and move on.

# /hn-search — recall from HyperNexus L2 memory
You are recalling durable context before deriving an answer from scratch.

Run:
```
node addons/hax/hn.mjs search "<query>" [limit default 8]
```
Hot-path variant (~15ms, prefer inside tight loops): `node addons/hax/hn.mjs fts "<query>" 5`.
Summarize what you found and how it changes the plan. If nothing relevant, say "no relevant L2 context" and proceed.

# /hn-session — session context + handoff
Show where this session stands and leave a trail for the next one.
```
node addons/hax/hn.mjs sessions 5
node addons/hax/hn.mjs session-context
```
At session end (or a natural checkpoint), write a handoff:
`node addons/hax/hn.mjs handoff "<what was done, what is next, open blockers>"`.
Read a prior handoff with `node addons/hax/hn.mjs handoff` when resuming work.

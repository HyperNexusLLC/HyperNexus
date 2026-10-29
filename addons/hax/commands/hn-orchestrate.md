# /hn-orchestrate — RECALL → DISCOVER → EXECUTE → PERSIST loop for a task
Run the full loop for the stated task:
1. RECALL: `node addons/hax/hn.mjs harvest "<task>" 8`
2. DISCOVER: `node addons/hax/hn.mjs tools "<task need>"` (top 3)
3. EXECUTE: do the task with the discovered tools/files
4. PERSIST: `node addons/hax/hn.mjs store "<title>" "<outcome + why>" "<tags>"` (+ graph relations if entities matter)
5. VERIFY: `node addons/hax/hn.mjs status` after production-affecting changes.
For independent sub-tasks, delegate with the subagent recipe: `hax --preset hn-worker -p "<subtask>"`
(which inherits provider/model/effort; keep delegation for parallelizable work only).

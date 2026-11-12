# /hn-context — manual L2 context harvest for the current task
Pull task-relevant memory + tool suggestions in one call, then brief the plan.
```
node addons/hax/hn.mjs harvest "<one-sentence task description>" 8
```
Report: (1) which memories matter, (2) which tools you'll use, (3) what you'll do first.
If the harvest is empty, say so and proceed from the repo.

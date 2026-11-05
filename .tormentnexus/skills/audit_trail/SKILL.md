---
name: audit-trail
description: 
source: ~\.a5c\process-library\babysitter-repo\library\methodologies\ccpm\skills\audit-trail\SKILL.md
category: process-library
date: 2026-06-14T07:33:24.193076

---

# Audit Trail

Full traceability from PRD to code commit through the CCPM spec-driven pipeline.

## Traceability Chain
PRD -> Epic -> Task -> GitHub Issue -> Code Commit

## Capabilities
- PRD user story to task mapping
- Task to GitHub issue linking
- Commit to issue cross-referencing
- Coverage matrix generation
- Audit completeness verification

## File Structure
```
.claude/
  prds/<feature-name>.md          # PRD with user stories
  epics/<feature-name>/
    epic.md                        # Technical epic
    1.md, 2.md, ...               # Individual tasks
    tasks-index.md                # Task index with traceability
```

## Audit Verification
The tracking process (`ccpm-tracking.js`) verifies:
- Every PRD user story maps to at least one task
- Every task maps to a GitHub issue (if sync enabled)
- Every completed task has associated commits
- Coverage percentage is reported

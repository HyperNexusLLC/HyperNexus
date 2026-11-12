---
name: story-development
description: 
source: ~\.a5c\process-library\babysitter-repo\library\methodologies\bmad-method\skills\story-development\SKILL.md
category: process-library
date: 2026-06-14T07:33:24.138438

---

# Story Development

Implement user stories with test-driven development methodology.

## Agent
Amelia (Developer) - `bmad-dev-amelia`

## Workflow
1. Read entire story and acceptance criteria
2. Write failing tests for each criterion
3. Implement minimum code to pass tests
4. Refactor while keeping tests green
5. Run full test suite
6. Document implementation decisions

## Inputs
- `projectName` - Project name
- `story` - Story with acceptance criteria and tasks
- `architecture` - Architecture decisions (optional)

## Outputs
- Implementation with passing tests
- Files changed list
- Acceptance criteria verification
- Implementation notes

## Process Files
- `bmad-orchestrator.js` - Phase 4 story development
- `bmad-implementation.js` - Sprint story development

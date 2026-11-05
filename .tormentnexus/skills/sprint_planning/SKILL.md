---
name: sprint-planning
description: 
source: ~\.a5c\process-library\babysitter-repo\library\methodologies\bmad-method\skills\sprint-planning\SKILL.md
category: process-library
date: 2026-06-14T07:33:24.134238

---

# Sprint Planning

Plan implementation sprints with story selection, goal definition, and execution ordering.

## Agent
Bob (Scrum Master) - `bmad-sm-bob`

## Workflow
1. Review available stories from epic backlog
2. Consider velocity from previous sprints
3. Select stories forming coherent sprint goal
4. Validate stories are implementation-ready
5. Order by dependency and priority
6. Define sprint goal and identify blockers

## Inputs
- `projectName` - Project name
- `sprintNumber` - Current sprint number
- `epics` - Available epics and stories
- `previousSprints` - Previous sprint results (optional)

## Outputs
- Sprint goal and selected stories
- Execution order with dependencies
- Story point commitment
- Blocker identification

## Process Files
- `bmad-orchestrator.js` - Phase 4 sprint planning
- `bmad-implementation.js` - Standalone implementation

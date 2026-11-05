---
name: quick-flow
description: 
source: ~\.a5c\process-library\babysitter-repo\library\methodologies\bmad-method\skills\quick-flow\SKILL.md
category: process-library
date: 2026-06-14T07:33:24.130341

---

# Quick Flow

Lean solo-developer workflow for rapid spec-to-implementation with minimal overhead.

## Agent
Barry (Solo Dev) - `bmad-solodev-barry`

## Workflow
1. Quick Spec: Create technical specification with stories
2. Quick Dev: Implement each story with tests
3. Code Review: Multi-dimensional quality assessment

## Inputs
- `projectName` - Project name
- `projectDescription` - Project requirements
- `techStack` - Preferred technology stack (optional)
- `storyCount` - Number of stories (default: 5)

## Outputs
- Technical specification with architecture decisions
- Implementation results per story
- Multi-dimensional code review with 0-100 score
- Summary for stakeholder communication

## Process Files
- `bmad-quick-flow.js` - Complete Quick Flow lifecycle

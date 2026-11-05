---
name: task-decomposition
description: Convert technical plans into actionable development tasks with dependency graphs, effort estimates, and parallelization opportunities.
source: ~\.a5c\process-library\babysitter-repo\library\methodologies\spec-kit\skills\task-decomposition\SKILL.md
category: process-library
date: 2026-06-14T07:33:24.710774

---



# Task Decomposition

## Overview

Decompose a technical plan into actionable development tasks. Each task is atomic, has clear acceptance criteria traceable to specification requirements, and includes dependency information for optimal execution ordering.

## When to Use

- After technical plan is approved, before implementation
- When breaking down a large feature into implementable units
- When identifying parallelization opportunities in a task set
- When estimating effort and critical path for a feature

## Key Principle

Every task must trace back to at least one specification requirement. Tasks must be atomic enough for a single development session. Dependency graphs must be acyclic.

## Process

1. **Decompose components** - Break architecture components into implementable tasks
2. **Define tasks** - Each with id, title, description, acceptance criteria, dependencies, effort
3. **Build dependency graph** - Show task ordering constraints
4. **Identify parallel groups** - Tasks with no mutual dependencies
5. **Determine critical path** - Longest dependency chain
6. **Generate test tasks** - Testing tasks alongside implementation
7. **Map to requirements** - Traceability from tasks to specification
8. **Human review** - Approve task list before implementation

## Tool Use

Invoke via babysitter process: `methodologies/spec-kit/spec-kit-planning` (task decomposition phase)
Full pipeline: `methodologies/spec-kit/spec-kit-orchestrator`

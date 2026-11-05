---
name: pr-shepherding
description: Monitor PR lifecycle from creation through merge including CI monitoring, review comment handling, thread resolution, and merge readiness verification.
source: ~\.a5c\process-library\babysitter-repo\library\methodologies\metaswarm\skills\pr-shepherding\SKILL.md
category: process-library
date: 2026-06-14T07:33:24.516225

---



# PR Shepherding

## Overview

Monitor and manage a PR from creation through merge. Handle CI failures, respond to review comments, resolve threads, and verify merge readiness.

## When to Use

- After PR creation from completed work
- When a PR needs CI monitoring
- When review comments need automated handling

## Process

1. **Monitor CI** - Watch pipeline status, triage failures
2. **Handle Comments** - Respond to review feedback, make code changes
3. **Resolve Threads** - Close addressed review threads
4. **Verify Readiness** - Check approvals, CI green, threads resolved, coverage met

## Merge Readiness Checklist (gtg)

- [ ] All CI checks passing
- [ ] Required approvals obtained
- [ ] All review threads resolved
- [ ] Coverage thresholds met
- [ ] No merge conflicts
- [ ] SERVICE-INVENTORY.md updated

## Agents Used

- `agents/pr-shepherd/` - PR lifecycle management

## Tool Use

Invoke via babysitter process: `methodologies/metaswarm/metaswarm-pr-shepherd`

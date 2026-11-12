---
name: test-enforcement
description: Automated test validation, coverage checking, and quality metrics with aggressive defaults
source: ~\.a5c\process-library\babysitter-repo\library\methodologies\maestro\skills\test-enforcement\SKILL.md
category: process-library
date: 2026-06-14T07:33:24.476610

---


# Test Enforcement

## Capabilities

Validates automated tests, checks coverage against thresholds, and reports quality metrics. Implements Maestro's "turn checks up to 11" philosophy with aggressive lint and test defaults.

## Tool Use Instructions

- Use **Bash** to run test suites, lint, and coverage commands
- Use **Read** to examine test files and coverage reports
- Use **Grep** to find untested code paths and missing test files
- Use **Glob** to verify test file naming conventions
- Use **Write** to generate coverage reports and test suggestions

## Process Integration

- Used across all Maestro processes for test verification
- Used in `maestro-maintenance.js` (Coverage gap analysis)
- Agents: Test Engineer, Coder (test writing)
- Enforces: unit tests, integration tests, lint, format
- Coverage thresholds configurable per project
- "Turn checks up to 11" default behavior

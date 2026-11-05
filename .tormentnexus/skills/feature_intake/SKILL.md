---
name: feature-intake
description: 
source: ~\.a5c\process-library\babysitter-repo\library\methodologies\automaker\skills\feature-intake\SKILL.md
category: process-library
date: 2026-06-14T07:33:24.077288

---

# Feature Intake

Parse and normalize features from text descriptions, images, and screenshots into structured requirements.

## Agent
Feature Planner - `automaker-feature-planner`

## Workflow
1. Parse feature title and description text
2. Analyze attached images and screenshots for UI requirements
3. Extract explicit and implicit requirements
4. Categorize feature type (UI, API, infrastructure, refactor, bugfix)
5. Estimate initial complexity
6. Extract acceptance criteria

## Inputs
- `projectName` - Project name
- `feature` - Feature object with id, title, description, attachments

## Outputs
- Parsed feature with extracted requirements, type, complexity, and acceptance criteria

## Process Files
- `automaker-feature-pipeline.js` - Stage 1
- `automaker-orchestrator.js` - Phase 1

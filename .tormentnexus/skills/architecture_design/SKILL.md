---
name: architecture-design
description: 
source: ~\.a5c\process-library\babysitter-repo\library\methodologies\bmad-method\skills\architecture-design\SKILL.md
category: process-library
date: 2026-06-14T07:33:24.105536

---

# Architecture Design

Design comprehensive system architecture with technology selection and ADRs.

## Agent
Winston (Architect) - `bmad-architect-winston`

## Workflow
1. Define high-level system architecture with components
2. Select technology stack with justification
3. Design data model and database architecture
4. Define API contracts and integration patterns
5. Plan security, scalability, and deployment
6. Document Architecture Decision Records (ADRs)
7. Validate implementation readiness

## Inputs
- `projectName` - Project name
- `prd` - Product Requirements Document
- `uxDesign` - UX design artifacts (optional)
- `complexity` - Project complexity level

## Outputs
- System architecture with component diagram
- Technology stack with rationale
- Data model and API contracts
- ADRs and readiness assessment

## Process Files
- `bmad-orchestrator.js` - Phase 3 of full lifecycle

---
name: project-documentation
description: 
source: ~\.a5c\process-library\babysitter-repo\library\methodologies\bmad-method\skills\project-documentation\SKILL.md
category: process-library
date: 2026-06-14T07:33:24.123449

---

# Project Documentation

Generate comprehensive project documentation with source tree analysis and Mermaid diagrams.

## Agent
Paige (Tech Writer) - `bmad-writer-paige`

## Workflow
1. Scan project structure and identify components
2. Analyze source tree with annotations
3. Generate project context for onboarding
4. Create deep-dive component documentation
5. Generate Mermaid architecture diagrams
6. Build documentation index with navigation

## Inputs
- `projectName` - Project name
- `projectPath` - Path to project root
- `documentationType` - full-scan, deep-dive, or context-only

## Outputs
- Scan report with component inventory
- Annotated source tree
- Project overview and onboarding guide
- Deep-dive component documentation
- Documentation index

## Process Files
- `bmad-document-project.js` - Standalone documentation
- `bmad-orchestrator.js` - Final documentation phase

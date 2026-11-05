---
name: permit-application-generator
description: Permit application preparation skill for building, environmental, and DOT permits
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\civil-engineering\skills\permit-application-generator\SKILL.md
category: process-library
date: 2026-06-14T07:33:29.148752

---



# Permit Application Generator Skill

## Purpose

The Permit Application Generator Skill prepares permit applications including building permits, environmental permits, and DOT permits with required supporting documentation.

## Capabilities

- Building permit forms
- Environmental permit forms
- DOT permit applications
- Supporting document checklist
- Fee calculation
- Submittal package assembly
- Agency form completion
- Application tracking

## Usage Guidelines

### When to Use
- Preparing permit applications
- Assembling permit packages
- Tracking permit status
- Responding to comments

### Prerequisites
- Design documents complete
- Supporting studies available
- Fees calculated
- Agency requirements known

### Best Practices
- Complete all required forms
- Include all attachments
- Track submittal dates
- Respond promptly to comments

## Process Integration

This skill integrates with:
- Permit Application Preparation

## Configuration

```yaml
permit-application-generator:
  permit-types:
    - building
    - environmental
    - DOT
    - utility
  outputs:
    - forms
    - checklists
    - packages
    - tracking-logs
```

## Output Artifacts

- Permit applications
- Supporting documents
- Submittal checklists
- Fee summaries

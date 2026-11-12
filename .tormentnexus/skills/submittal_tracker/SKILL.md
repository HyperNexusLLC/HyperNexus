---
name: submittal-tracker
description: Construction submittal tracking skill for document management and review workflow
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\civil-engineering\skills\submittal-tracker\SKILL.md
category: process-library
date: 2026-06-14T07:33:29.201647

---



# Submittal Tracker Skill

## Purpose

The Submittal Tracker Skill manages construction submittals including log management, review workflow automation, and approval tracking.

## Capabilities

- Submittal log management
- Review workflow automation
- Specification section linking
- Response time tracking
- Revision management
- Approval stamp generation
- Distribution tracking
- Status reporting

## Usage Guidelines

### When to Use
- Managing project submittals
- Tracking review status
- Monitoring response times
- Generating status reports

### Prerequisites
- Submittal register established
- Review workflow defined
- Spec sections identified
- Response times specified

### Best Practices
- Track all submittals
- Monitor response times
- Document review comments
- Maintain revision history

## Process Integration

This skill integrates with:
- Shop Drawing Review
- Construction Quality Control

## Configuration

```yaml
submittal-tracker:
  status-types:
    - pending
    - under-review
    - approved
    - rejected
    - resubmit
  tracking:
    - dates
    - reviewers
    - comments
    - revisions
```

## Output Artifacts

- Submittal logs
- Status reports
- Response time analysis
- Approval stamps

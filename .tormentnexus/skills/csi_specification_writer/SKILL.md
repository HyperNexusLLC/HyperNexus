---
name: csi-specification-writer
description: CSI MasterFormat specification writing skill for construction document preparation
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\civil-engineering\skills\csi-specification-writer\SKILL.md
category: process-library
date: 2026-06-14T07:33:29.093565

---



# CSI Specification Writer Skill

## Purpose

The CSI Specification Writer Skill creates construction specifications following CSI MasterFormat organization with standard paragraph libraries and project customization.

## Capabilities

- MasterFormat organization
- Section template generation
- Standard paragraph library
- Edit tracking
- Reference standard linking
- Project-specific customization
- Coordination with drawings
- Quality assurance specifications

## Usage Guidelines

### When to Use
- Writing project specifications
- Customizing standard sections
- Coordinating with drawings
- Updating spec libraries

### Prerequisites
- Design decisions made
- Product selections complete
- Drawing coordination done
- Quality requirements defined

### Best Practices
- Follow MasterFormat numbering
- Coordinate with drawings
- Avoid proprietary specs
- Review for completeness

## Process Integration

This skill integrates with:
- Specifications Development

## Configuration

```yaml
csi-specification-writer:
  format:
    - MasterFormat
    - SectionFormat
    - PageFormat
  sections:
    - Division-00
    - Division-01
    - technical
  outputs:
    - docx
    - pdf
    - speclink
```

## Output Artifacts

- Specification sections
- Table of contents
- Reference standard lists
- Coordination logs

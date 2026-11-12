---
name: steel-connection-designer
description: Steel connection design skill for bolted and welded connections per AISC specifications
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\civil-engineering\skills\steel-connection-designer\SKILL.md
category: process-library
date: 2026-06-14T07:33:29.197195

---



# Steel Connection Designer Skill

## Purpose

The Steel Connection Designer Skill designs structural steel connections including bolted and welded connections per AISC 360 and AISC 341 for seismic applications.

## Capabilities

- Bolted connection design per AISC 360
- Welded connection design
- Moment connection design per AISC 358
- Shear tab, end plate, angle connections
- Base plate and anchor rod design per AISC Design Guide 1
- Seismic connection detailing per AISC 341
- Column splice design
- Bracing connection design

## Usage Guidelines

### When to Use
- Designing steel connections
- Verifying connection capacity
- Detailing seismic connections
- Evaluating existing connections

### Prerequisites
- Member forces established
- Member sizes selected
- Connection type determined
- Seismic requirements identified

### Best Practices
- Consider erection requirements
- Check all limit states
- Detail for seismic ductility
- Coordinate with fabricator

## Process Integration

This skill integrates with:
- Structural Steel Design
- Bridge Design LRFD
- Seismic Design Analysis

## Configuration

```yaml
steel-connection-designer:
  connection-types:
    - shear-tab
    - end-plate
    - angle
    - base-plate
    - column-splice
    - bracing
  design-codes:
    - AISC-360
    - AISC-341
    - AISC-358
```

## Output Artifacts

- Connection calculations
- Connection details
- Material summaries
- Bolt and weld schedules

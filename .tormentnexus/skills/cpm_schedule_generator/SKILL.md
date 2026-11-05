---
name: cpm-schedule-generator
description: Critical Path Method scheduling skill for construction schedule development and analysis
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\civil-engineering\skills\cpm-schedule-generator\SKILL.md
category: process-library
date: 2026-06-14T07:33:29.088707

---



# CPM Schedule Generator Skill

## Purpose

The CPM Schedule Generator Skill develops construction schedules using Critical Path Method including activity sequencing, float analysis, and resource leveling.

## Capabilities

- Critical path calculation
- Float analysis (total, free, independent)
- Resource leveling
- Schedule compression
- Gantt chart generation
- Progress tracking
- Baseline comparison
- What-if analysis

## Usage Guidelines

### When to Use
- Developing project schedules
- Analyzing schedule impacts
- Tracking project progress
- Evaluating alternatives

### Prerequisites
- Activity list defined
- Duration estimates available
- Logic relationships established
- Resource constraints identified

### Best Practices
- Use realistic durations
- Verify logic relationships
- Identify driving paths
- Update regularly

## Process Integration

This skill integrates with:
- Construction Schedule Development

## Configuration

```yaml
cpm-schedule-generator:
  analysis-types:
    - forward-pass
    - backward-pass
    - float-analysis
    - resource-leveling
  outputs:
    - gantt-chart
    - network-diagram
    - reports
```

## Output Artifacts

- Project schedules
- Critical path reports
- Float analyses
- Resource histograms

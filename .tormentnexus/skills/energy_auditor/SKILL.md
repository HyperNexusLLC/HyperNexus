---
name: energy-auditor
description: Process energy audit skill for consumption analysis, benchmarking, and efficiency improvement identification
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\chemical-engineering\skills\energy-auditor\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.930393

---



# Energy Auditor Skill

## Purpose

The Energy Auditor Skill performs process energy audits to analyze consumption patterns, benchmark performance, and identify energy efficiency improvement opportunities.

## Capabilities

- Energy consumption mapping
- Energy balance analysis
- Utility system analysis
- Benchmarking against best practice
- Heat integration opportunities
- Equipment efficiency assessment
- Steam system optimization
- Compressed air system analysis
- Improvement prioritization

## Usage Guidelines

### When to Use
- Conducting energy audits
- Identifying efficiency opportunities
- Benchmarking energy performance
- Prioritizing improvements

### Prerequisites
- Energy data available
- Process flows documented
- Equipment specifications known
- Utility costs defined

### Best Practices
- Use consistent boundaries
- Normalize for production
- Verify data quality
- Prioritize by payback

## Process Integration

This skill integrates with:
- Energy Efficiency Optimization
- Heat Integration Analysis
- Process Sustainability Assessment

## Configuration

```yaml
energy-auditor:
  audit-levels:
    - walk-through
    - standard
    - detailed
  systems:
    - steam
    - electricity
    - fuel
    - compressed-air
    - cooling-water
```

## Output Artifacts

- Energy audit reports
- Sankey diagrams
- Benchmark comparisons
- Improvement recommendations
- Payback analyses

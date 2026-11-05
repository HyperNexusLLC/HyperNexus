---
name: lca-analyzer
description: Life Cycle Assessment skill for environmental impact evaluation and sustainability analysis
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\chemical-engineering\skills\lca-analyzer\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.955171

---



# LCA Analyzer Skill

## Purpose

The LCA Analyzer Skill performs Life Cycle Assessment to evaluate environmental impacts across process life cycles and support sustainable process design decisions.

## Capabilities

- Goal and scope definition
- Life cycle inventory (LCI) development
- Impact assessment (LCIA)
- Carbon footprint calculation
- Water footprint analysis
- Energy analysis
- Sensitivity analysis
- Comparative assessments
- Hot spot identification

## Usage Guidelines

### When to Use
- Evaluating process sustainability
- Comparing design alternatives
- Calculating carbon footprints
- Identifying improvement opportunities

### Prerequisites
- Process data available
- System boundaries defined
- Impact categories selected
- Inventory databases accessible

### Best Practices
- Follow ISO 14040/14044
- Document assumptions clearly
- Perform sensitivity analysis
- Use peer review for public claims

## Process Integration

This skill integrates with:
- Process Sustainability Assessment
- Green Chemistry Metrics Evaluation
- Energy Efficiency Optimization

## Configuration

```yaml
lca-analyzer:
  standards:
    - ISO-14040
    - ISO-14044
  impact-methods:
    - CML
    - ReCiPe
    - TRACI
  databases:
    - ecoinvent
    - US-LCI
    - GaBi
```

## Output Artifacts

- LCA reports
- Impact assessment results
- Comparative analyses
- Hot spot analysis
- Improvement recommendations

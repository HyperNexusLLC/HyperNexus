---
name: process-economics-estimator
description: Process economics estimation skill for capital costs, operating costs, and profitability analysis
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\chemical-engineering\skills\process-economics-estimator\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.988955

---



# Process Economics Estimator Skill

## Purpose

The Process Economics Estimator Skill performs economic analysis of chemical processes including capital cost estimation, operating cost calculation, and profitability metrics.

## Capabilities

- Capital cost estimation (factored, equipment-based)
- Operating cost calculation
- Raw material cost analysis
- Utility cost calculation
- Labor cost estimation
- Depreciation and taxes
- Profitability metrics (NPV, IRR, payback)
- Sensitivity analysis
- Monte Carlo simulation

## Usage Guidelines

### When to Use
- Evaluating project economics
- Comparing process alternatives
- Supporting investment decisions
- Analyzing sensitivity

### Prerequisites
- Equipment list available
- Capacity defined
- Utility requirements known
- Market prices available

### Best Practices
- Use appropriate estimation method
- Document all assumptions
- Include contingency
- Perform sensitivity analysis

## Process Integration

This skill integrates with:
- Equipment Sizing and Specification
- Process Flow Diagram Development
- Separation Sequence Synthesis

## Configuration

```yaml
process-economics-estimator:
  estimation-classes:
    - order-of-magnitude
    - study
    - preliminary
    - definitive
  profitability-metrics:
    - NPV
    - IRR
    - payback
    - ROI
```

## Output Artifacts

- Capital cost estimates
- Operating cost analyses
- Cash flow projections
- Profitability analyses
- Sensitivity charts

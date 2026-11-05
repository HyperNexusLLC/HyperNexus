---
name: green-chemistry-metrics
description: Green chemistry metrics calculation skill for atom economy, E-factor, and process mass intensity
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\chemical-engineering\skills\green-chemistry-metrics\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.938369

---



# Green Chemistry Metrics Skill

## Purpose

The Green Chemistry Metrics Skill calculates and evaluates green chemistry metrics to assess process sustainability and guide process improvement toward greener alternatives.

## Capabilities

- Atom economy calculation
- E-factor analysis
- Process mass intensity (PMI)
- Reaction mass efficiency
- Carbon efficiency
- Solvent intensity
- Energy intensity
- Water intensity
- Renewables fraction

## Usage Guidelines

### When to Use
- Evaluating process greenness
- Comparing synthesis routes
- Setting sustainability targets
- Tracking improvement progress

### Prerequisites
- Process stoichiometry defined
- Mass balance available
- Solvent usage documented
- Energy consumption known

### Best Practices
- Calculate multiple metrics
- Compare against benchmarks
- Track trends over time
- Consider full life cycle

## Process Integration

This skill integrates with:
- Green Chemistry Metrics Evaluation
- Process Sustainability Assessment
- Waste Minimization Analysis

## Configuration

```yaml
green-chemistry-metrics:
  metrics:
    - atom-economy
    - e-factor
    - pmi
    - carbon-efficiency
  benchmarks:
    - pharmaceutical
    - fine-chemical
    - commodity
```

## Output Artifacts

- Metrics calculations
- Benchmark comparisons
- Trend analyses
- Improvement recommendations
- Sustainability scorecards

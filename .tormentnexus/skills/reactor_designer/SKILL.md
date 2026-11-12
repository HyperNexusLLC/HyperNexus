---
name: reactor-designer
description: Chemical reactor design skill for sizing, configuration selection, and performance optimization
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\chemical-engineering\skills\reactor-designer\SKILL.md
category: process-library
date: 2026-06-14T07:33:29.001917

---



# Reactor Designer Skill

## Purpose

The Reactor Designer Skill performs chemical reactor design calculations, including reactor type selection, sizing, configuration optimization, and performance prediction.

## Capabilities

- Reactor type selection (CSTR, PFR, batch, fluidized bed)
- Reactor sizing calculations
- Conversion and yield predictions
- Residence time distribution analysis
- Heat management design
- Multiple reactor configurations
- Recycle stream optimization
- Scale-up considerations

## Usage Guidelines

### When to Use
- Designing new reactor systems
- Optimizing existing reactor performance
- Evaluating reactor alternatives
- Scale-up reactor designs

### Prerequisites
- Kinetic model available
- Feed specifications defined
- Target conversion specified
- Operating constraints identified

### Best Practices
- Consider heat effects carefully
- Evaluate multiple configurations
- Include safety margins
- Validate with pilot data

## Process Integration

This skill integrates with:
- Kinetic Model Development
- Catalyst Evaluation and Optimization
- Process Simulation Model Development

## Configuration

```yaml
reactor-designer:
  reactor-types:
    - cstr
    - pfr
    - batch
    - semi-batch
    - fluidized-bed
  design-methods:
    - sizing
    - optimization
    - performance-prediction
```

## Output Artifacts

- Reactor specifications
- Sizing calculations
- Performance predictions
- Configuration comparisons
- Heat duty calculations

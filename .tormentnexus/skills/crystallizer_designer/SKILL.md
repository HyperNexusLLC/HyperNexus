---
name: crystallizer-designer
description: Crystallization process design skill for nucleation control, crystal size distribution, and equipment selection
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\chemical-engineering\skills\crystallizer-designer\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.921996

---



# Crystallizer Designer Skill

## Purpose

The Crystallizer Designer Skill designs crystallization processes including equipment selection, operating conditions optimization, and crystal size distribution control.

## Capabilities

- Solubility data analysis
- Supersaturation control strategies
- Nucleation and growth kinetics
- Crystal size distribution (CSD) modeling
- Equipment selection (cooling, evaporative, reactive)
- Seeding strategies
- Polymorphism control
- Scale-up considerations

## Usage Guidelines

### When to Use
- Designing crystallization processes
- Optimizing crystal quality
- Controlling polymorphic forms
- Scale-up crystallization operations

### Prerequisites
- Solubility data available
- Product specifications defined
- Kinetic data available
- Polymorphism understood

### Best Practices
- Characterize metastable zone
- Control supersaturation carefully
- Use seeding for reproducibility
- Monitor CSD online

## Process Integration

This skill integrates with:
- Crystallization Process Design
- Separation Sequence Synthesis
- Process Flow Diagram Development

## Configuration

```yaml
crystallizer-designer:
  crystallizer-types:
    - cooling
    - evaporative
    - reactive
    - antisolvent
    - melt
  control-strategies:
    - temperature
    - concentration
    - seeding
```

## Output Artifacts

- Crystallizer specifications
- Operating protocols
- CSD predictions
- Seeding strategies
- Scale-up recommendations

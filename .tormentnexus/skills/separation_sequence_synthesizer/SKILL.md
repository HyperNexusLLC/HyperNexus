---
name: separation-sequence-synthesizer
description: Separation train synthesis skill for optimal sequencing and technology selection
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\chemical-engineering\skills\separation-sequence-synthesizer\SKILL.md
category: process-library
date: 2026-06-14T07:33:29.014029

---



# Separation Sequence Synthesizer Skill

## Purpose

The Separation Sequence Synthesizer Skill develops optimal separation sequences by evaluating technology alternatives and sequencing options for multi-component mixtures.

## Capabilities

- Separation feasibility analysis
- Sequencing heuristics application
- Technology screening (distillation, extraction, membrane)
- Heat integration opportunities
- Hybrid separation systems
- Economic evaluation
- Energy optimization
- Azeotrope breaking strategies

## Usage Guidelines

### When to Use
- Designing new separation trains
- Optimizing existing sequences
- Evaluating technology alternatives
- Integrating hybrid systems

### Prerequisites
- Mixture characterization complete
- Product specifications defined
- Property data available
- Economic criteria established

### Best Practices
- Screen technologies systematically
- Consider heat integration early
- Evaluate hybrid options
- Validate with simulation

## Process Integration

This skill integrates with:
- Separation Sequence Synthesis
- Process Flow Diagram Development
- Heat Integration Analysis

## Configuration

```yaml
separation-sequence-synthesizer:
  technologies:
    - distillation
    - extraction
    - membrane
    - adsorption
    - crystallization
  optimization-objectives:
    - energy
    - capital
    - total-cost
```

## Output Artifacts

- Sequence recommendations
- Technology comparisons
- Heat integration analysis
- Economic evaluations
- Process flow diagrams

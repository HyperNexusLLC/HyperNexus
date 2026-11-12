---
name: catalyst-analyzer
description: Catalyst performance analysis skill for activity testing, deactivation modeling, and optimization
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\chemical-engineering\skills\catalyst-analyzer\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.905846

---



# Catalyst Analyzer Skill

## Purpose

The Catalyst Analyzer Skill evaluates catalyst performance, models deactivation kinetics, and supports catalyst selection and optimization for chemical processes.

## Capabilities

- Catalyst activity measurement analysis
- Selectivity evaluation
- Deactivation kinetics modeling
- Regeneration cycle optimization
- Catalyst screening support
- Turnover frequency calculation
- Surface area and porosity analysis
- Poison identification

## Usage Guidelines

### When to Use
- Evaluating catalyst candidates
- Modeling catalyst deactivation
- Optimizing regeneration cycles
- Troubleshooting performance decline

### Prerequisites
- Experimental data available
- Reaction mechanism understood
- Operating conditions defined
- Reference catalyst identified

### Best Practices
- Use consistent testing protocols
- Account for mass transfer effects
- Consider long-term stability
- Validate deactivation models

## Process Integration

This skill integrates with:
- Catalyst Evaluation and Optimization
- Kinetic Model Development
- Reactor Design and Selection

## Configuration

```yaml
catalyst-analyzer:
  analysis-types:
    - activity
    - selectivity
    - deactivation
    - regeneration
  catalyst-types:
    - heterogeneous
    - homogeneous
    - biocatalyst
```

## Output Artifacts

- Activity profiles
- Deactivation models
- Regeneration protocols
- Screening comparisons
- Recommendation reports

---
name: corrosion-materials-selector
description: Materials selection skill for corrosion resistance based on process conditions and industry standards
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\chemical-engineering\skills\corrosion-materials-selector\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.918824

---



# Corrosion Materials Selector Skill

## Purpose

The Corrosion Materials Selector Skill recommends materials of construction based on process conditions, corrosion mechanisms, and industry standards to ensure equipment reliability.

## Capabilities

- Corrosion mechanism identification
- Material screening
- Corrosion rate estimation
- Corrosion allowance calculation
- Material specification development
- Isocorrosion curve analysis
- Galvanic compatibility assessment
- Stress corrosion cracking evaluation
- Cost-benefit analysis

## Usage Guidelines

### When to Use
- Selecting materials for new equipment
- Evaluating corrosion failures
- Assessing process changes
- Specifying replacement materials

### Prerequisites
- Process conditions defined
- Chemical composition known
- Operating temperature/pressure specified
- Design life established

### Best Practices
- Consider all corrosion mechanisms
- Use conservative assumptions
- Reference industry standards
- Validate with experience data

## Process Integration

This skill integrates with:
- Equipment Sizing and Specification
- Process Flow Diagram Development
- HAZOP Study Facilitation

## Configuration

```yaml
corrosion-materials-selector:
  standards:
    - NACE
    - API
    - ASME
  material-classes:
    - carbon-steel
    - stainless-steel
    - nickel-alloys
    - non-metallics
```

## Output Artifacts

- Material recommendations
- Corrosion assessments
- Material specifications
- Cost comparisons
- Design life estimates

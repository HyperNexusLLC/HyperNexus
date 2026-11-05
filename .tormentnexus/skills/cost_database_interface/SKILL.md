---
name: cost-database-interface
description: Construction cost database interface skill for unit costs, productivity, and regional adjustments
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\civil-engineering\skills\cost-database-interface\SKILL.md
category: process-library
date: 2026-06-14T07:33:29.083984

---



# Cost Database Interface Skill

## Purpose

The Cost Database Interface Skill provides access to construction cost databases for unit costs, crew productivity rates, and regional cost adjustments.

## Capabilities

- RS Means database integration
- Unit cost lookup
- Regional cost adjustments
- Crew productivity rates
- Equipment rental rates
- Material price indices
- Historical cost trending
- Location factor application

## Usage Guidelines

### When to Use
- Developing cost estimates
- Benchmarking project costs
- Adjusting for location
- Forecasting costs

### Prerequisites
- Database access configured
- Cost categories identified
- Location factors known
- Time period specified

### Best Practices
- Use current data
- Apply appropriate factors
- Verify for local conditions
- Document cost sources

## Process Integration

This skill integrates with:
- Construction Cost Estimation

## Configuration

```yaml
cost-database-interface:
  databases:
    - rs-means
    - dodge
    - eni
  data-types:
    - unit-costs
    - productivity
    - equipment
    - materials
  adjustments:
    - location
    - time
    - size
```

## Output Artifacts

- Cost data extracts
- Location factors
- Productivity data
- Cost indices

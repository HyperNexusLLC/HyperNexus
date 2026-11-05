---
name: green-synthesis-evaluator
description: Sustainability assessment skill for evaluating and designing environmentally friendly nanomaterial synthesis routes
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\nanotechnology\skills\green-synthesis-evaluator\SKILL.md
category: process-library
date: 2026-06-14T07:33:30.123489

---



# Green Synthesis Evaluator

## Purpose

The Green Synthesis Evaluator skill provides comprehensive sustainability assessment for nanomaterial synthesis routes, enabling design of environmentally friendly processes through green chemistry metrics and lifecycle analysis.

## Capabilities

- Green chemistry metrics calculation (E-factor, atom economy)
- Lifecycle assessment integration
- Bio-based precursor database
- Solvent sustainability scoring
- Energy consumption estimation
- Waste minimization strategies

## Usage Guidelines

### Sustainability Assessment

1. **Green Chemistry Metrics**
   - E-factor = mass waste / mass product
   - Atom economy = MW product / MW reactants x 100%
   - Process mass intensity (PMI)

2. **Solvent Selection**
   - Use GSK solvent selection guide
   - Prefer water, ethanol, or bio-solvents
   - Avoid chlorinated and aromatic solvents

3. **Energy Optimization**
   - Minimize reaction temperatures
   - Reduce processing times
   - Consider microwave/ultrasonic assistance

## Process Integration

- Green Synthesis Route Development
- Nanoparticle Synthesis Protocol Development

## Input Schema

```json
{
  "current_synthesis": {
    "precursors": ["string"],
    "solvents": ["string"],
    "temperatures": ["number"],
    "reagent_masses": ["number"]
  },
  "product_mass": "number (g)",
  "product_type": "string"
}
```

## Output Schema

```json
{
  "sustainability_metrics": {
    "e_factor": "number",
    "atom_economy": "number (%)",
    "pmi": "number"
  },
  "solvent_score": "number (1-10)",
  "green_alternatives": [{
    "change": "string",
    "improvement": "string",
    "feasibility": "high|medium|low"
  }],
  "overall_rating": "string"
}
```

---
name: environmental-fate-modeler
description: Environmental nanosafety skill for modeling nanomaterial environmental fate and transport
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\nanotechnology\skills\environmental-fate-modeler\SKILL.md
category: process-library
date: 2026-06-14T07:33:30.098561

---



# Environmental Fate Modeler

## Purpose

The Environmental Fate Modeler skill provides comprehensive modeling of nanomaterial environmental behavior, enabling prediction of transport, transformation, and ecological impact for responsible nanotechnology development.

## Capabilities

- Dissolution and aggregation modeling
- Bioaccumulation prediction
- Environmental exposure assessment
- Ecotoxicity data analysis
- Lifecycle impact assessment
- Risk characterization

## Usage Guidelines

### Fate Modeling

1. **Transformation Processes**
   - Model dissolution kinetics
   - Predict aggregation behavior
   - Account for surface transformations

2. **Transport Modeling**
   - Estimate environmental partitioning
   - Model transport in water/soil/air
   - Consider heteroaggregation

3. **Risk Assessment**
   - Compare PEC to PNEC
   - Calculate risk quotients
   - Identify sensitive endpoints

## Process Integration

- Nanomaterial Safety Assessment Pipeline
- Green Synthesis Route Development

## Input Schema

```json
{
  "nanomaterial": "string",
  "release_scenario": "production|use|disposal",
  "environmental_compartment": "water|soil|air",
  "physicochemical_properties": {
    "size": "number (nm)",
    "surface_charge": "number (mV)",
    "dissolution_rate": "number"
  }
}
```

## Output Schema

```json
{
  "fate_prediction": {
    "half_life": "number (days)",
    "dominant_process": "string",
    "final_form": "string"
  },
  "exposure": {
    "pec": "number",
    "unit": "string",
    "compartment": "string"
  },
  "risk": {
    "pnec": "number",
    "risk_quotient": "number",
    "risk_level": "low|medium|high"
  }
}
```

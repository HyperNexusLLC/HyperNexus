---
name: ald-process-controller
description: Atomic Layer Deposition skill for conformal thin film deposition with atomic-level thickness control
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\nanotechnology\skills\ald-process-controller\SKILL.md
category: process-library
date: 2026-06-14T07:33:30.041197

---



# ALD Process Controller

## Purpose

The ALD Process Controller skill provides comprehensive atomic layer deposition process control, enabling conformal thin film growth with atomic-level precision through optimized pulse sequences and in-situ monitoring.

## Capabilities

- Precursor pulse/purge optimization
- Growth per cycle (GPC) characterization
- Film uniformity mapping
- Conformality assessment
- In-situ monitoring integration
- Multi-component film design

## Usage Guidelines

### ALD Process Control

1. **Saturation Studies**
   - Vary pulse times
   - Identify saturation dose
   - Optimize purge times

2. **Process Window**
   - Determine ALD window
   - Optimize temperature
   - Monitor GPC stability

3. **Film Quality**
   - Characterize uniformity
   - Measure conformality
   - Assess impurity levels

## Process Integration

- Thin Film Deposition Process Optimization
- Nanodevice Integration Process Flow

## Input Schema

```json
{
  "material": "string",
  "precursor_a": "string",
  "precursor_b": "string",
  "target_thickness": "number (nm)",
  "substrate": "string",
  "temperature": "number (C)"
}
```

## Output Schema

```json
{
  "optimized_recipe": {
    "precursor_a_pulse": "number (s)",
    "purge_a": "number (s)",
    "precursor_b_pulse": "number (s)",
    "purge_b": "number (s)"
  },
  "gpc": "number (Angstrom/cycle)",
  "cycles_required": "number",
  "uniformity": "number (%)",
  "conformality": "number (% step coverage)"
}
```

---
name: cleanroom-metrology-controller
description: Nanofabrication metrology skill for process control with CD-SEM, ellipsometry, and profilometry
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\nanotechnology\skills\cleanroom-metrology-controller\SKILL.md
category: process-library
date: 2026-06-14T07:33:30.049971

---



# Cleanroom Metrology Controller

## Purpose

The Cleanroom Metrology Controller skill provides comprehensive in-line metrology for nanofabrication process control, enabling precise measurement and monitoring of critical dimensions, film thicknesses, and pattern quality.

## Capabilities

- CD-SEM measurement recipes
- Spectroscopic ellipsometry analysis
- Film thickness mapping
- Surface profilometry
- Defect inspection
- Overlay measurement

## Usage Guidelines

### Metrology Control

1. **CD-SEM Measurements**
   - Develop automated recipes
   - Calibrate against reference
   - Track process variation

2. **Ellipsometry**
   - Select appropriate model
   - Map thickness uniformity
   - Characterize optical constants

3. **Defect Inspection**
   - Set detection thresholds
   - Classify defect types
   - Track yield trends

## Process Integration

- All fabrication processes
- Analysis Pipeline Validation

## Input Schema

```json
{
  "measurement_type": "cd_sem|ellipsometry|profilometry|defect",
  "target_parameter": "string",
  "wafer_map": {"sites": "number", "pattern": "string"},
  "specification": {
    "target": "number",
    "tolerance": "number"
  }
}
```

## Output Schema

```json
{
  "measurements": [{
    "site": "string",
    "value": "number",
    "unit": "string"
  }],
  "statistics": {
    "mean": "number",
    "std_dev": "number",
    "range": "number"
  },
  "uniformity": "number (%)",
  "pass_fail": "boolean",
  "trending_data": {"dates": [], "values": []}
}
```

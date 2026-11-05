---
name: ebl-process-controller
description: Electron Beam Lithography skill for high-resolution nanopatterning with dose optimization and proximity effect correction
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\nanotechnology\skills\ebl-process-controller\SKILL.md
category: process-library
date: 2026-06-14T07:33:30.093772

---



# EBL Process Controller

## Purpose

The EBL Process Controller skill provides comprehensive electron beam lithography process control, enabling high-resolution nanopatterning through dose optimization, proximity effect correction, and critical dimension control.

## Capabilities

- Pattern design and fracturing
- Dose optimization and modulation
- Proximity effect correction (PEC)
- Alignment and overlay control
- Resist processing optimization
- Critical dimension (CD) control

## Usage Guidelines

### EBL Process Control

1. **Pattern Preparation**
   - Design in CAD software
   - Fracture into write fields
   - Apply beam step size

2. **Dose Optimization**
   - Run dose matrices
   - Apply PEC algorithms
   - Account for pattern density

3. **Process Integration**
   - Optimize resist thickness
   - Control development conditions
   - Verify feature dimensions

## Process Integration

- Nanolithography Process Development
- Nanodevice Integration Process Flow

## Input Schema

```json
{
  "pattern_file": "string",
  "resist": "string",
  "thickness": "number (nm)",
  "target_cd": "number (nm)",
  "beam_voltage": "number (kV)",
  "beam_current": "number (pA)"
}
```

## Output Schema

```json
{
  "optimized_dose": "number (uC/cm2)",
  "pec_parameters": {
    "alpha": "number",
    "beta": "number",
    "eta": "number"
  },
  "write_time": "number (hours)",
  "expected_cd": "number (nm)",
  "cd_uniformity": "number (3sigma)"
}
```

---
name: wind-tunnel-correlation
description: Specialized skill for correlating CFD predictions with experimental wind tunnel data
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\aerospace-engineering\skills\wind-tunnel-correlation\SKILL.md
category: process-library
date: 2026-06-14T07:33:28.407832
tags:
  - 
---



# Wind Tunnel Data Correlation Skill

## Purpose
Enable accurate correlation between CFD predictions and experimental wind tunnel data through systematic data processing, correction methods, and statistical analysis.

## Capabilities
- Data normalization and scaling procedures
- Reynolds number and Mach number corrections
- Wall interference and blockage corrections
- Uncertainty quantification methods
- Model calibration techniques
- Statistical analysis and regression
- Data quality assessment
- Correlation report generation

## Usage Guidelines
- Apply appropriate wind tunnel corrections based on test section geometry
- Account for support interference effects in force measurements
- Use proper Reynolds number scaling when comparing to flight conditions
- Document uncertainty sources and propagation methods
- Validate correlation quality using statistical metrics
- Generate comprehensive correlation reports for design reviews

## Dependencies
- MATLAB
- Python scipy/numpy
- Test data formats (DAT, CSV, HDF5)

## Process Integration
- AE-002: Wind Tunnel Test Correlation
- AE-003: Aerodynamic Database Generation

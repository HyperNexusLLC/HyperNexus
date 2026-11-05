---
name: sensitivity-analysis-uq
description: Global sensitivity analysis methods
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\mathematics\skills\sensitivity-analysis-uq\SKILL.md
category: process-library
date: 2026-06-14T07:33:29.839796

---



# Sensitivity Analysis (UQ)

## Purpose

Provides global sensitivity analysis methods for understanding model behavior and input importance.

## Capabilities

- Sobol indices computation
- Morris screening method
- FAST (Fourier amplitude sensitivity test)
- Correlation-based sensitivity
- Derivative-based sensitivity (DGSM)
- Variance-based decomposition

## Usage Guidelines

1. **Method Selection**: Choose based on computational budget
2. **Input Ranges**: Define appropriate input ranges
3. **Sample Size**: Ensure sufficient samples for convergence
4. **Interpretation**: Correctly interpret sensitivity indices

## Tools/Libraries

- SALib
- OpenTURNS
- UQLab

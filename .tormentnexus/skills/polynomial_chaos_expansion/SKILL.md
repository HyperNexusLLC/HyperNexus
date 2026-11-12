---
name: polynomial-chaos-expansion
description: Polynomial chaos for uncertainty propagation
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\mathematics\skills\polynomial-chaos-expansion\SKILL.md
category: process-library
date: 2026-06-14T07:33:29.810004

---



# Polynomial Chaos Expansion

## Purpose

Provides polynomial chaos expansion methods for efficient uncertainty propagation in computational models.

## Capabilities

- Generalized polynomial chaos bases
- Sparse PCE construction
- Adaptive basis selection
- PCE-based sensitivity indices
- Low-rank tensor approximation
- Stochastic Galerkin projection

## Usage Guidelines

1. **Basis Selection**: Match basis to input distributions
2. **Truncation**: Choose appropriate polynomial order
3. **Sparsity**: Exploit sparsity for high dimensions
4. **Sensitivity**: Extract Sobol indices from PCE coefficients

## Tools/Libraries

- Chaospy
- UQLab
- OpenTURNS

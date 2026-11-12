---
name: mcmc-diagnostics
description: MCMC convergence diagnostics and analysis
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\mathematics\skills\mcmc-diagnostics\SKILL.md
category: process-library
date: 2026-06-14T07:33:29.769498

---



# MCMC Diagnostics

## Purpose

Provides MCMC convergence diagnostics and analysis capabilities for validating Bayesian inference results.

## Capabilities

- Rhat (potential scale reduction) computation
- Effective sample size (ESS) calculation
- Trace plot generation
- Autocorrelation analysis
- Divergence detection
- Energy diagnostic (E-BFMI)

## Usage Guidelines

1. **Convergence Check**: Verify Rhat < 1.01 for all parameters
2. **Sample Quality**: Ensure ESS is sufficient for inference
3. **Visual Inspection**: Review trace plots for mixing
4. **Divergences**: Address divergent transitions

## Tools/Libraries

- ArviZ
- CODA
- MCMCpack

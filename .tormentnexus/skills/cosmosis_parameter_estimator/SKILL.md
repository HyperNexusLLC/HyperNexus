---
name: cosmosis-parameter-estimator
description: CosmoSIS cosmological parameter estimation skill for MCMC sampling and likelihood analysis
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\physics\skills\cosmosis-parameter-estimator\SKILL.md
category: process-library
date: 2026-06-14T07:33:30.287295

---



# CosmoSIS Parameter Estimator

## Purpose

Provides expert guidance on CosmoSIS for cosmological parameter estimation, including modular likelihood construction and MCMC sampling.

## Capabilities

- Modular likelihood construction
- Multiple sampler support (emcee, multinest, polychord)
- Prior specification
- Chain analysis and diagnostics
- Plotting and visualization
- Pipeline construction

## Usage Guidelines

1. **Pipeline Setup**: Configure modular analysis pipeline
2. **Likelihoods**: Build likelihood functions from data
3. **Priors**: Specify parameter priors
4. **Sampling**: Run MCMC with appropriate sampler
5. **Analysis**: Analyze chains and compute posteriors

## Tools/Libraries

- CosmoSIS
- emcee
- GetDist

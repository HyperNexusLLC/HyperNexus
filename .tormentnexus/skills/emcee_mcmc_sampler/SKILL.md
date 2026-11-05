---
name: emcee-mcmc-sampler
description: emcee MCMC skill for Bayesian parameter estimation and posterior sampling in physics applications
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\physics\skills\emcee-mcmc-sampler\SKILL.md
category: process-library
date: 2026-06-14T07:33:30.296309

---



# emcee MCMC Sampler

## Purpose

Provides expert guidance on emcee for Bayesian parameter estimation in physics, including ensemble sampling and convergence diagnostics.

## Capabilities

- Affine-invariant ensemble sampling
- Parallel tempering support
- Autocorrelation analysis
- Convergence diagnostics
- Prior/likelihood specification
- Chain visualization

## Usage Guidelines

1. **Model Setup**: Define log-probability function
2. **Initialization**: Initialize walkers appropriately
3. **Sampling**: Run ensemble sampler
4. **Convergence**: Check autocorrelation and convergence
5. **Analysis**: Extract posterior distributions

## Tools/Libraries

- emcee
- corner
- arviz

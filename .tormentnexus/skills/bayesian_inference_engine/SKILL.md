---
name: bayesian-inference-engine
description: Bayesian probabilistic reasoning for prior specification, posterior computation, and belief updating
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\scientific-discovery\skills\bayesian-inference-engine\SKILL.md
category: process-library
date: 2026-06-14T07:33:30.670573

---



# Bayesian Inference Engine

## Purpose

Provides Bayesian probabilistic reasoning capabilities for prior specification, posterior computation, and sequential belief updating.

## Capabilities

- Prior elicitation support
- MCMC sampling (NUTS, HMC)
- Variational inference
- Model comparison (Bayes factors, LOO-CV)
- Posterior predictive checking
- Sequential belief updating

## Usage Guidelines

1. **Prior Selection**: Choose appropriate, defensible priors
2. **Sampling**: Use efficient MCMC algorithms
3. **Diagnostics**: Check convergence and mixing
4. **Model Comparison**: Use appropriate comparison criteria

## Tools/Libraries

- PyMC
- Stan (PyStan)
- ArviZ
- NumPyro

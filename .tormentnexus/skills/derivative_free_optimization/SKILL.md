---
name: derivative-free-optimization
description: Optimization without gradient information
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\mathematics\skills\derivative-free-optimization\SKILL.md
category: process-library
date: 2026-06-14T07:33:29.715834

---



# Derivative-Free Optimization

## Purpose

Provides optimization capabilities for problems where gradient information is unavailable or unreliable.

## Capabilities

- Nelder-Mead simplex method
- Powell's method
- Surrogate-based optimization
- Bayesian optimization
- Pattern search methods
- Trust region methods

## Usage Guidelines

1. **Method Selection**: Choose based on problem characteristics
2. **Function Evaluations**: Minimize expensive function calls
3. **Surrogate Models**: Build and refine surrogate approximations
4. **Exploration-Exploitation**: Balance search strategies

## Tools/Libraries

- scipy.optimize
- Optuna
- GPyOpt

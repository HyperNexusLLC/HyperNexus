---
name: nonlinear-optimization-solver
description: Solve general nonlinear optimization problems
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\mathematics\skills\nonlinear-optimization-solver\SKILL.md
category: process-library
date: 2026-06-14T07:33:29.791182

---



# Nonlinear Optimization Solver

## Purpose

Provides capabilities for solving general nonlinear optimization problems including constrained and unconstrained formulations.

## Capabilities

- Gradient-based methods (BFGS, L-BFGS, CG)
- Newton and quasi-Newton methods
- Interior point methods
- Sequential quadratic programming (SQP)
- Global optimization (basin-hopping, differential evolution)
- Constraint handling

## Usage Guidelines

1. **Starting Point**: Provide good initial guesses
2. **Gradient Information**: Supply gradients when available
3. **Global vs Local**: Choose global methods for multimodal problems
4. **Constraint Handling**: Use appropriate constraint formulations

## Tools/Libraries

- IPOPT
- KNITRO
- NLopt
- scipy.optimize

---
name: qubo-formulator
description: QUBO (Quadratic Unconstrained Binary Optimization) formulation skill for optimization problems
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\quantum-computing\skills\qubo-formulator\SKILL.md
category: process-library
date: 2026-06-14T07:33:30.606962

---



# QUBO Formulator

## Purpose

Provides expert guidance on formulating optimization problems as QUBO/Ising models for execution on quantum annealers and variational algorithms.

## Capabilities

- Problem encoding to QUBO/Ising
- Constraint handling (penalty methods)
- Variable reduction techniques
- D-Wave integration
- QAOA cost Hamiltonian construction
- Solution decoding
- Embedding optimization
- Penalty weight tuning

## Usage Guidelines

1. **Problem Definition**: Formalize optimization problem mathematically
2. **Binary Encoding**: Convert variables to binary representation
3. **Constraint Handling**: Add penalty terms for constraints
4. **QUBO Construction**: Build quadratic matrix form
5. **Solution Interpretation**: Decode binary solutions to original problem

## Tools/Libraries

- D-Wave Ocean
- PyQUBO
- Qiskit Optimization
- dimod
- dwavebinarycsp

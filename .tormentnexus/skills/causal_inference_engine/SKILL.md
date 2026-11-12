---
name: causal-inference-engine
description: Causal reasoning implementing DAG construction, do-calculus, and intervention effect estimation
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\scientific-discovery\skills\causal-inference-engine\SKILL.md
category: process-library
date: 2026-06-14T07:33:30.675864

---



# Causal Inference Engine

## Purpose

Provides causal reasoning capabilities implementing DAG construction, do-calculus, and intervention effect estimation.

## Capabilities

- Causal DAG construction and validation
- Backdoor/frontdoor criterion checking
- Average treatment effect estimation
- Instrumental variable analysis
- Mediation analysis
- Sensitivity analysis for unmeasured confounding

## Usage Guidelines

1. **DAG Construction**: Build causal graphs from domain knowledge
2. **Identification**: Check if effects are identifiable
3. **Estimation**: Apply appropriate estimation methods
4. **Sensitivity**: Assess robustness to unmeasured confounding

## Tools/Libraries

- DoWhy
- CausalNex
- pgmpy
- EconML

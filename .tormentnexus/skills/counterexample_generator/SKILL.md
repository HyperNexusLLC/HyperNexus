---
name: counterexample-generator
description: Automated search for counterexamples to mathematical conjectures
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\mathematics\skills\counterexample-generator\SKILL.md
category: process-library
date: 2026-06-14T07:33:29.709966

---



# Counterexample Generator

## Purpose

Provides automated search capabilities for finding counterexamples to mathematical conjectures and validating proof attempts.

## Capabilities

- Random testing with intelligent sampling
- SMT-based counterexample search
- Quickcheck-style property testing
- Boundary case enumeration
- Finite model finding (Nitpick, Quickcheck)

## Usage Guidelines

1. **Property Specification**: Define testable properties formally
2. **Sampling Strategy**: Choose appropriate random distributions
3. **Constraint Solving**: Use SMT for structured search
4. **Boundary Testing**: Exhaustively check small cases

## Tools/Libraries

- Z3
- CVC5
- Quickcheck
- Nitpick

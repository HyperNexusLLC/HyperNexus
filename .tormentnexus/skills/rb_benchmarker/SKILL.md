---
name: rb-benchmarker
description: Randomized benchmarking skill for gate fidelity characterization
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\quantum-computing\skills\rb-benchmarker\SKILL.md
category: process-library
date: 2026-06-14T07:33:30.611412

---



# RB Benchmarker

## Purpose

Provides expert guidance on randomized benchmarking protocols for characterizing quantum gate fidelities and hardware performance.

## Capabilities

- Standard randomized benchmarking
- Interleaved randomized benchmarking
- Simultaneous RB for crosstalk
- Character benchmarking
- Cycle benchmarking
- Fidelity decay fitting
- SPAM error separation
- Confidence interval estimation

## Usage Guidelines

1. **Protocol Selection**: Choose RB variant based on characterization goals
2. **Sequence Generation**: Create random Clifford sequences of varying lengths
3. **Execution**: Run benchmarking experiments with sufficient statistics
4. **Fitting**: Analyze decay curves to extract fidelity parameters
5. **Reporting**: Generate comprehensive benchmarking reports

## Tools/Libraries

- Qiskit Experiments
- Cirq
- True-Q
- PyGSTi
- SciPy

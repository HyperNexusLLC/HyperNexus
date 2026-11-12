---
name: backend-selector
description: Multi-backend comparison and selection skill for optimal hardware choice
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\quantum-computing\skills\backend-selector\SKILL.md
category: process-library
date: 2026-06-14T07:33:30.457135

---



# Backend Selector

## Purpose

Provides expert guidance on comparing and selecting quantum backends across multiple providers based on circuit requirements and performance criteria.

## Capabilities

- Backend capability comparison
- Queue time estimation
- Cost optimization
- Fidelity-based ranking
- Connectivity analysis
- Job prioritization
- Provider API integration
- Historical performance tracking

## Usage Guidelines

1. **Requirements Analysis**: Determine circuit qubit and gate requirements
2. **Backend Query**: Fetch available backends from all providers
3. **Filtering**: Eliminate backends that cannot support circuit
4. **Ranking**: Score backends by fidelity, queue time, and cost
5. **Selection**: Choose optimal backend for execution

## Tools/Libraries

- Qiskit
- Amazon Braket
- Cirq
- Azure Quantum SDK
- pytket

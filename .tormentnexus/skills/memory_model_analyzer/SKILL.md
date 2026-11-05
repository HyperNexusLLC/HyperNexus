---
name: memory-model-analyzer
description: Analyze programs under various memory models for concurrent correctness
source: ~\.a5c\process-library\babysitter-repo\library\specializations\domains\science\computer-science\skills\memory-model-analyzer\SKILL.md
category: process-library
date: 2026-06-14T07:33:29.302714

---



# Memory Model Analyzer

## Purpose

Provides expert guidance on analyzing concurrent programs under various hardware and language memory models.

## Capabilities

- Sequential consistency checking
- Total Store Order (TSO) analysis
- C/C++ memory model compliance
- Memory barrier insertion guidance
- Race condition detection
- Weak memory model reasoning

## Usage Guidelines

1. **Model Selection**: Identify relevant memory model
2. **Analysis**: Check program behavior under model
3. **Barrier Placement**: Determine required fences/barriers
4. **Race Detection**: Find data races
5. **Verification**: Verify correct synchronization

## Tools/Libraries

- CDSChecker
- GenMC
- CBMC
- herd7

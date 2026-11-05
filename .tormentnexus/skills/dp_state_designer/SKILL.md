---
name: dp-state-designer
description: Assist in designing optimal DP states and transitions
source: ~\.a5c\process-library\babysitter-repo\library\specializations\algorithms-optimization\skills\dp-state-designer\SKILL.md
category: process-library
date: 2026-06-14T07:33:25.102195

---



# DP State Designer Skill

## Purpose

Assist in designing optimal dynamic programming states, transitions, and optimizations for complex DP problems.

## Capabilities

- Identify subproblem structure from problem description
- Suggest state representations (dimensions, parameters)
- Derive transition formulas
- Identify optimization opportunities (rolling array, bitmask compression)
- Generate state space complexity estimates
- Detect overlapping subproblems

## Target Processes

- dp-pattern-matching
- dp-state-optimization
- dp-transition-derivation
- advanced-dp-techniques

## DP Design Framework

1. **Subproblem Identification**: What smaller problems compose the solution?
2. **State Definition**: What parameters uniquely identify a subproblem?
3. **Transition Formula**: How do we combine subproblem solutions?
4. **Base Cases**: What are the trivial subproblems?
5. **Computation Order**: In what order should we solve subproblems?
6. **Space Optimization**: Can we reduce memory usage?

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "problemDescription": { "type": "string" },
    "constraints": { "type": "object" },
    "examples": { "type": "array" },
    "requestType": {
      "type": "string",
      "enum": ["fullDesign", "stateOnly", "transitions", "optimize"]
    }
  },
  "required": ["problemDescription", "requestType"]
}
```

## Output Schema

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "state": {
      "type": "object",
      "properties": {
        "definition": { "type": "string" },
        "parameters": { "type": "array" },
        "complexity": { "type": "string" }
      }
    },
    "transitions": { "type": "array" },
    "baseCases": { "type": "array" },
    "optimizations": { "type": "array" }
  },
  "required": ["success"]
}
```

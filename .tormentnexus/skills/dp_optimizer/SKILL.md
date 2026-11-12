---
name: dp-optimizer
description: Apply advanced DP optimizations automatically
source: ~\.a5c\process-library\babysitter-repo\library\specializations\algorithms-optimization\skills\dp-optimizer\SKILL.md
category: process-library
date: 2026-06-14T07:33:25.093029

---



# DP Optimizer Skill

## Purpose

Apply advanced dynamic programming optimizations to improve time and space complexity of DP solutions.

## Capabilities

- Convex hull trick detection and application
- Divide and conquer optimization
- Knuth optimization
- Monotonic queue/deque optimization
- Alien's trick / WQS binary search
- Rolling array optimization
- Bitmask compression

## Target Processes

- dp-state-optimization
- advanced-dp-techniques
- complexity-optimization

## Optimization Techniques

### Time Optimizations
1. **Convex Hull Trick**: O(n^2) -> O(n log n) for certain recurrences
2. **Divide & Conquer**: O(n^2 k) -> O(n k log n) when optimal j is monotonic
3. **Knuth Optimization**: O(n^3) -> O(n^2) for certain interval DP
4. **Monotonic Queue**: O(n*k) -> O(n) for sliding window DP

### Space Optimizations
1. **Rolling Array**: O(n*m) -> O(m) when only previous row needed
2. **Bitmask Compression**: Reduce state space with bit manipulation

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "dpCode": { "type": "string" },
    "stateDefinition": { "type": "string" },
    "transitions": { "type": "string" },
    "currentComplexity": { "type": "string" },
    "targetComplexity": { "type": "string" },
    "optimizationType": {
      "type": "string",
      "enum": ["auto", "convexHull", "divideConquer", "knuth", "monotonic", "space"]
    }
  },
  "required": ["dpCode", "optimizationType"]
}
```

## Output Schema

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "optimizedCode": { "type": "string" },
    "optimizationApplied": { "type": "string" },
    "newComplexity": { "type": "string" },
    "explanation": { "type": "string" }
  },
  "required": ["success"]
}
```

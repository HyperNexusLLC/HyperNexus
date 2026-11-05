---
name: Register Allocation
description: Expert skill for register allocation algorithms including graph coloring, linear scan, and spill code generation
source: ~\.a5c\process-library\babysitter-repo\library\specializations\programming-languages\skills\register-allocation\SKILL.md
category: process-library
date: 2026-06-14T07:33:32.602711

---



# Register Allocation Skill

## Overview

Expert skill for register allocation algorithms including graph coloring, linear scan, and spill code generation.

## Capabilities

- Implement graph coloring register allocation
- Implement linear scan register allocation
- Generate spill code with minimal overhead
- Handle calling convention register constraints
- Implement register coalescing
- Handle pre-colored nodes and fixed registers
- Implement live range splitting
- Design register pressure analysis

## Target Processes

- jit-compiler-development.js
- code-generation-llvm.js
- bytecode-vm-implementation.js

## Dependencies

None (algorithmic skill)

## Usage Guidelines

1. **Algorithm Selection**: Use linear scan for JIT (fast), graph coloring for AOT (optimal)
2. **Live Ranges**: Compute accurate live ranges before allocation
3. **Spill Costs**: Use heuristics to minimize spill costs (loop depth, usage frequency)
4. **Calling Conventions**: Handle caller/callee-saved registers correctly
5. **Coalescing**: Implement aggressive coalescing to reduce moves

## Output Schema

```json
{
  "type": "object",
  "properties": {
    "algorithm": {
      "type": "string",
      "enum": ["graph-coloring", "linear-scan", "second-chance-binpacking"]
    },
    "spillStrategy": { "type": "string" },
    "registerClasses": {
      "type": "array",
      "items": { "type": "string" }
    },
    "generatedFiles": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

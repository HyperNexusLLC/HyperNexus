---
name: advanced-ds-library
description: Provide implementations of advanced data structures
source: ~\.a5c\process-library\babysitter-repo\library\specializations\algorithms-optimization\skills\advanced-ds-library\SKILL.md
category: process-library
date: 2026-06-14T07:33:25.046158

---



# Advanced Data Structures Library Skill

## Purpose

Provide implementations and guidance for advanced data structures commonly needed in competitive programming and complex algorithmic problems.

## Capabilities

- Treaps, Splay trees, Link-cut trees
- Persistent data structures
- Wavelet trees
- Heavy-light decomposition
- Centroid decomposition
- Rope data structure
- Order statistics tree

## Target Processes

- data-structure-implementation
- advanced-graph-algorithms
- cp-library-creation

## Data Structure Catalog

### Balanced BSTs
- Treap (randomized BST)
- Splay Tree (self-adjusting)
- AVL Tree
- Red-Black Tree

### Tree Decomposition
- Heavy-Light Decomposition
- Centroid Decomposition
- Euler Tour Technique

### Advanced Structures
- Link-Cut Trees (dynamic trees)
- Wavelet Tree (range queries)
- Persistent Segment Tree
- Rope (string with fast operations)

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "dataStructure": { "type": "string" },
    "operations": { "type": "array" },
    "language": {
      "type": "string",
      "enum": ["cpp", "python", "java"]
    },
    "includeTests": { "type": "boolean", "default": false }
  },
  "required": ["dataStructure"]
}
```

## Output Schema

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "code": { "type": "string" },
    "complexity": { "type": "object" },
    "usage": { "type": "string" },
    "applications": { "type": "array" }
  },
  "required": ["success"]
}
```

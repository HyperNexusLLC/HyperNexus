---
name: graph-modeler
description: Convert problem descriptions into graph representations
source: ~\.a5c\process-library\babysitter-repo\library\specializations\algorithms-optimization\skills\graph-modeler\SKILL.md
category: process-library
date: 2026-06-14T07:33:25.127502

---



# Graph Modeler Skill

## Purpose

Convert problem descriptions into appropriate graph representations, identifying entities as nodes and relationships as edges.

## Capabilities

- Entity-to-node mapping from problem text
- Relationship-to-edge mapping
- Graph property detection (bipartite, DAG, tree, etc.)
- Suggest optimal representation (adjacency list vs matrix)
- Generate graph visualization
- Identify implicit graph structures

## Target Processes

- graph-modeling
- shortest-path-algorithms
- graph-traversal
- advanced-graph-algorithms

## Graph Modeling Framework

1. **Entity Identification**: What objects/states become nodes?
2. **Relationship Analysis**: What connections become edges?
3. **Edge Properties**: Directed? Weighted? Capacities?
4. **Graph Properties**: Special structure to exploit?
5. **Representation Choice**: List vs matrix vs implicit?

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "problemDescription": { "type": "string" },
    "constraints": { "type": "object" },
    "examples": { "type": "array" },
    "outputFormat": {
      "type": "string",
      "enum": ["analysis", "code", "visualization"]
    }
  },
  "required": ["problemDescription"]
}
```

## Output Schema

```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "nodes": { "type": "object" },
    "edges": { "type": "object" },
    "properties": {
      "type": "object",
      "properties": {
        "directed": { "type": "boolean" },
        "weighted": { "type": "boolean" },
        "bipartite": { "type": "boolean" },
        "dag": { "type": "boolean" },
        "tree": { "type": "boolean" }
      }
    },
    "representation": { "type": "string" },
    "suggestedAlgorithms": { "type": "array" }
  },
  "required": ["success"]
}
```

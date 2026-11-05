---
name: nx
description: Nx workspace configuration, generators, and affected commands.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\web-development\skills\nx\SKILL.md
category: process-library
date: 2026-06-14T07:33:33.909513

---



# Nx Skill

Expert assistance for Nx monorepo management.

## Capabilities

- Configure Nx workspaces
- Create custom generators
- Use affected commands
- Set up caching
- Define project boundaries

## Configuration

```json
// nx.json
{
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "test": {
      "cache": true
    }
  },
  "affected": {
    "defaultBase": "main"
  }
}
```

## Commands

```bash
# Run affected
nx affected:build
nx affected:test

# Graph
nx graph

# Generate
nx generate @nx/react:component Button
```

## Target Processes

- monorepo-management
- enterprise-architecture
- code-generation

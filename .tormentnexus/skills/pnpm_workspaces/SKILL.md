---
name: pnpm-workspaces
description: pnpm workspace patterns and dependency management.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\web-development\skills\pnpm-workspaces\SKILL.md
category: process-library
date: 2026-06-14T07:33:33.930072

---



# pnpm Workspaces Skill

Expert assistance for pnpm workspace management.

## Capabilities

- Configure workspaces
- Manage dependencies
- Handle peer dependencies
- Publish packages
- Optimize node_modules

## Configuration

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// package.json
{
  "name": "root",
  "private": true,
  "scripts": {
    "build": "pnpm -r build",
    "dev": "pnpm -r --parallel dev"
  }
}
```

## Commands

```bash
# Install in workspace
pnpm add lodash --filter @repo/web

# Run in all packages
pnpm -r build

# Run in specific package
pnpm --filter @repo/ui build
```

## Target Processes

- monorepo-setup
- dependency-management
- package-publishing

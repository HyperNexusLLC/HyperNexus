---
name: cross-env-setup
description: Configure cross-env for cross-platform environment variable setting in npm scripts and CLI commands.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\cli-mcp-development\skills\cross-env-setup\SKILL.md
category: process-library
date: 2026-06-14T07:33:25.305657

---



# Cross-Env Setup

Configure cross-env for cross-platform environment variables.

## Capabilities

- Set up cross-env in package.json
- Configure environment variable scripts
- Handle platform-specific vars
- Integrate with npm scripts

## Generated Patterns

```json
{
  "scripts": {
    "dev": "cross-env NODE_ENV=development tsx watch src/index.ts",
    "build": "cross-env NODE_ENV=production tsc",
    "test": "cross-env NODE_ENV=test vitest",
    "start:prod": "cross-env NODE_ENV=production node dist/index.js"
  },
  "devDependencies": {
    "cross-env": "^7.0.3"
  }
}
```

## Target Processes

- cross-platform-cli-compatibility
- configuration-management-system
- cli-application-bootstrap

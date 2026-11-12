---
name: npm-publish-config
description: Configure npm publishing with proper bin entry, files, and registry settings.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\cli-mcp-development\skills\npm-publish-config\SKILL.md
category: process-library
date: 2026-06-14T07:33:25.417092

---



# NPM Publish Config

Configure npm publishing for CLI packages.

## Generated Patterns

```json
{
  "name": "@myorg/mycli",
  "version": "1.0.0",
  "bin": { "mycli": "./dist/index.js" },
  "files": ["dist", "README.md", "LICENSE"],
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "engines": { "node": ">=18" },
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },
  "scripts": {
    "prepublishOnly": "npm run build && npm test"
  }
}
```

## Target Processes

- package-manager-publishing
- cli-binary-distribution

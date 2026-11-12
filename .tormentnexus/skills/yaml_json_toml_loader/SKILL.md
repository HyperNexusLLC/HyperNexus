---
name: yaml-json-toml-loader
description: Generate multi-format configuration file loaders for YAML, JSON, and TOML formats.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\cli-mcp-development\skills\yaml-json-toml-loader\SKILL.md
category: process-library
date: 2026-06-14T07:33:25.498937

---



# YAML/JSON/TOML Loader

Generate multi-format config file loaders.

## Generated Patterns

```typescript
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import toml from '@iarna/toml';

type ConfigFormat = 'json' | 'yaml' | 'toml' | 'auto';

export function loadConfigFile(filepath: string, format: ConfigFormat = 'auto'): unknown {
  const content = fs.readFileSync(filepath, 'utf-8');
  const ext = format === 'auto' ? path.extname(filepath).toLowerCase() : `.${format}`;

  switch (ext) {
    case '.json': return JSON.parse(content);
    case '.yaml': case '.yml': return yaml.parse(content);
    case '.toml': return toml.parse(content);
    default: throw new Error(`Unknown config format: ${ext}`);
  }
}

export function saveConfigFile(filepath: string, data: unknown, format: ConfigFormat = 'auto'): void {
  const ext = format === 'auto' ? path.extname(filepath).toLowerCase() : `.${format}`;
  let content: string;

  switch (ext) {
    case '.json': content = JSON.stringify(data, null, 2); break;
    case '.yaml': case '.yml': content = yaml.stringify(data); break;
    case '.toml': content = toml.stringify(data as any); break;
    default: throw new Error(`Unknown format: ${ext}`);
  }

  fs.writeFileSync(filepath, content);
}
```

## Target Processes

- configuration-management-system
- cli-application-bootstrap

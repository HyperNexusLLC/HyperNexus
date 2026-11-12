---
name: cli-snapshot-tester
description: Set up snapshot testing for CLI output with update workflows and diff reporting.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\cli-mcp-development\skills\cli-snapshot-tester\SKILL.md
category: process-library
date: 2026-06-14T07:33:25.270539

---



# CLI Snapshot Tester

Set up snapshot testing for CLI output.

## Generated Patterns

```typescript
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export function runCliSnapshot(cmd: string, name: string): void {
  const output = execSync(cmd, { encoding: 'utf-8' });
  const snapshotPath = path.join('__snapshots__', `${name}.txt`);

  if (process.env.UPDATE_SNAPSHOTS) {
    fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
    fs.writeFileSync(snapshotPath, output);
    return;
  }

  const expected = fs.readFileSync(snapshotPath, 'utf-8');
  expect(output).toBe(expected);
}
```

## Target Processes

- cli-unit-integration-testing
- cli-documentation-generation

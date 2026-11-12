---
name: cli-mock-stdin
description: Create mock stdin utilities for interactive CLI testing.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\cli-mcp-development\skills\cli-mock-stdin\SKILL.md
category: process-library
date: 2026-06-14T07:33:25.261966

---



# CLI Mock Stdin

Create mock stdin utilities for testing.

## Generated Patterns

```typescript
import { Readable } from 'stream';

export function mockStdin(inputs: string[]): Readable {
  let index = 0;
  return new Readable({
    read() {
      if (index < inputs.length) {
        setTimeout(() => {
          this.push(inputs[index++] + '\n');
        }, 10);
      } else {
        this.push(null);
      }
    },
  });
}

export async function runWithStdin(
  cmd: () => Promise<void>,
  inputs: string[]
): Promise<void> {
  const originalStdin = process.stdin;
  Object.defineProperty(process, 'stdin', { value: mockStdin(inputs) });
  try {
    await cmd();
  } finally {
    Object.defineProperty(process, 'stdin', { value: originalStdin });
  }
}
```

## Target Processes

- cli-unit-integration-testing
- interactive-prompt-system

---
name: esbuild
description: esbuild bundling, plugins, and build optimization.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\web-development\skills\esbuild\SKILL.md
category: process-library
date: 2026-06-14T07:33:33.811511

---



# esbuild Skill

Expert assistance for fast bundling with esbuild.

## Capabilities

- Configure esbuild
- Create plugins
- Optimize builds
- Handle TypeScript
- Bundle for Node.js/browser

## Usage

```javascript
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  sourcemap: true,
  target: ['es2020'],
  outfile: 'dist/bundle.js',
  plugins: [myPlugin],
});
```

## Target Processes

- build-optimization
- cli-tools
- fast-bundling

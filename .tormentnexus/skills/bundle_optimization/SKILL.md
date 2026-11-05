---
name: bundle-optimization
description: Bundle analysis, code splitting, tree shaking, and size optimization.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\web-development\skills\bundle-optimization\SKILL.md
category: process-library
date: 2026-06-14T07:33:33.776590

---



# Bundle Optimization Skill

Expert assistance for JavaScript bundle optimization.

## Capabilities

- Analyze bundle size
- Implement code splitting
- Configure tree shaking
- Optimize dependencies
- Set up lazy loading

## Analysis

```bash
# webpack-bundle-analyzer
npx webpack-bundle-analyzer stats.json

# source-map-explorer
npx source-map-explorer dist/*.js
```

## Code Splitting

```typescript
// Route-based splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));

// Library splitting
const { Chart } = await import('chart.js');
```

## Target Processes

- bundle-optimization
- performance-improvement
- build-optimization

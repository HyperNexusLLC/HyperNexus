---
name: vite
description: Vite configuration, plugins, optimization, HMR, and build customization.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\web-development\skills\vite\SKILL.md
category: process-library
date: 2026-06-14T07:33:34.063416

---



# Vite Skill

Expert assistance for configuring and optimizing Vite builds.

## Capabilities

- Configure Vite for various frameworks
- Create and use plugins
- Optimize builds
- Configure dev server
- Handle environment variables

## Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
});
```

## Target Processes

- frontend-build-setup
- development-environment
- build-optimization

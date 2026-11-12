---
name: webpack
description: Webpack configuration, module federation, loaders, plugins, and optimization.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\web-development\skills\webpack\SKILL.md
category: process-library
date: 2026-06-14T07:33:34.089210

---



# Webpack Skill

Expert assistance for Webpack configuration and optimization.

## Capabilities

- Configure webpack for production
- Set up Module Federation
- Create custom loaders/plugins
- Optimize bundle size
- Configure code splitting

## Configuration

```javascript
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
        },
      },
    },
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'app',
      remotes: { shared: 'shared@http://localhost:3001/remoteEntry.js' },
    }),
  ],
};
```

## Target Processes

- build-optimization
- micro-frontend-architecture
- legacy-migration

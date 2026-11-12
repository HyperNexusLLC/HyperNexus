---
name: turbopack
description: Turbopack configuration and Next.js integration.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\web-development\skills\turbopack\SKILL.md
category: process-library
date: 2026-06-14T07:33:34.045980

---



# Turbopack Skill

Expert assistance for Turbopack configuration with Next.js.

## Capabilities

- Configure Turbopack
- Optimize for Next.js
- Handle custom configuration
- Debug build issues

## Usage

```bash
next dev --turbo
```

```javascript
// next.config.js
module.exports = {
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
};
```

## Target Processes

- nextjs-development
- build-optimization

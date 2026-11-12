---
name: vercel
description: Vercel deployment, edge functions, environment configuration, and preview deployments.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\web-development\skills\vercel\SKILL.md
category: process-library
date: 2026-06-14T07:33:34.059348

---



# Vercel Skill

Expert assistance for deploying to Vercel.

## Capabilities

- Configure Vercel projects
- Set up Edge Functions
- Manage environment variables
- Configure preview deployments
- Optimize for Edge

## Configuration

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "api/**/*.ts": {
      "memory": 1024,
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ]
}
```

## Target Processes

- vercel-deployment
- edge-functions
- nextjs-deployment

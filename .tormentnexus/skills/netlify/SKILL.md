---
name: netlify
description: Netlify deployment, functions, forms, and edge handlers.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\web-development\skills\netlify\SKILL.md
category: process-library
date: 2026-06-14T07:33:33.884755

---



# Netlify Skill

Expert assistance for deploying to Netlify.

## Capabilities

- Configure Netlify deployments
- Create Netlify Functions
- Handle form submissions
- Set up edge handlers
- Configure redirects

## Configuration

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
```

## Target Processes

- netlify-deployment
- serverless-functions
- jamstack-deployment

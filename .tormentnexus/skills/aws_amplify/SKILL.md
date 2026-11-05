---
name: aws-amplify
description: AWS Amplify deployment, hosting, and backend resources.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\web-development\skills\aws-amplify\SKILL.md
category: process-library
date: 2026-06-14T07:33:33.773071

---



# AWS Amplify Skill

Expert assistance for AWS Amplify deployment and hosting.

## Capabilities

- Configure Amplify hosting
- Set up CI/CD
- Manage backend resources
- Configure custom domains
- Handle authentication

## Configuration

```yaml
# amplify.yml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

## Target Processes

- aws-deployment
- full-stack-hosting
- enterprise-deployment

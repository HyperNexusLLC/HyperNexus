---
name: sandbox-entitlements-auditor
description: Audit and recommend minimal sandbox entitlements for secure desktop applications
source: ~\.a5c\process-library\babysitter-repo\library\specializations\desktop-development\skills\sandbox-entitlements-auditor\SKILL.md
category: process-library
date: 2026-06-14T07:33:26.258260
tags:
  - security
  - sandbox
  - entitlements
  - audit
  - macos
---



# sandbox-entitlements-auditor

Audit existing entitlements and recommend minimal sandbox permissions for secure desktop applications, primarily for macOS but applicable concepts for other platforms.

## Capabilities

- Analyze current entitlements usage
- Detect over-permissioned configurations
- Recommend minimal entitlement sets
- Check for security anti-patterns
- Verify MAS compliance
- Generate audit reports

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "projectPath": { "type": "string" },
    "entitlementsPath": { "type": "string" },
    "targetDistribution": { "enum": ["mas", "direct", "both"] }
  },
  "required": ["projectPath"]
}
```

## Audit Checks

- Unnecessary file system access
- Broad network permissions when not needed
- Hardened runtime exceptions
- JIT compilation allowance
- Library validation disabling

## Related Skills

- `macos-entitlements-generator`
- `security-hardening` process

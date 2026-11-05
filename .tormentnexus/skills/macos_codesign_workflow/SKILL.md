---
name: macos-codesign-workflow
description: Execute macOS code signing with Developer ID and hardened runtime requirements
source: ~\.a5c\process-library\babysitter-repo\library\specializations\desktop-development\skills\macos-codesign-workflow\SKILL.md
category: process-library
date: 2026-06-14T07:33:26.172874
tags:
  - macos
  - codesigning
  - developerid
  - security
  - apple
---



# macos-codesign-workflow

Execute macOS code signing with Developer ID certificates and hardened runtime. This skill handles the complete code signing process for macOS applications.

## Capabilities

- Sign app bundles with Developer ID
- Configure hardened runtime
- Sign nested frameworks and binaries
- Configure entitlements
- Verify signatures
- Set up CI/CD signing
- Handle keychain management

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "appPath": { "type": "string" },
    "identity": { "type": "string" },
    "entitlements": { "type": "string" },
    "hardenedRuntime": { "type": "boolean", "default": true }
  },
  "required": ["appPath", "identity"]
}
```

## Signing Commands

```bash
# Sign app bundle with hardened runtime
codesign --force --options runtime --timestamp \
    --entitlements MyApp.entitlements \
    --sign "Developer ID Application: Company Name (TEAMID)" \
    MyApp.app

# Sign nested components first
find MyApp.app -name "*.dylib" -o -name "*.framework" | \
    xargs -I {} codesign --force --options runtime --timestamp \
    --sign "Developer ID Application: Company Name (TEAMID)" {}

# Verify signature
codesign --verify --deep --strict --verbose=2 MyApp.app
spctl --assess --type execute --verbose MyApp.app
```

## Related Skills

- `macos-notarization-workflow`
- `macos-entitlements-generator`

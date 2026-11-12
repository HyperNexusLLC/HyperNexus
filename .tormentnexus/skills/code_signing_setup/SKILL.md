---
name: code-signing-setup
description: Configure code signing for macOS and Windows binaries with notarization.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\cli-mcp-development\skills\code-signing-setup\SKILL.md
category: process-library
date: 2026-06-14T07:33:25.285965

---



# Code Signing Setup

Configure code signing for binaries.

## Generated Patterns

```yaml
# macOS notarization with electron-builder/notarize
notarize:
  appBundleId: com.myorg.myapp
  appleId: $APPLE_ID
  appleIdPassword: $APPLE_ID_PASSWORD
  teamId: $APPLE_TEAM_ID

# Windows signing
signtool:
  certificateFile: $CERTIFICATE_FILE
  certificatePassword: $CERTIFICATE_PASSWORD
  timestampServer: http://timestamp.digicert.com
```

## Target Processes

- cli-binary-distribution
- package-manager-publishing

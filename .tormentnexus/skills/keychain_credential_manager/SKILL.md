---
name: keychain-credential-manager
description: Manage credentials in OS keychains across Windows, macOS, and Linux
source: ~\.a5c\process-library\babysitter-repo\library\specializations\desktop-development\skills\keychain-credential-manager\SKILL.md
category: process-library
date: 2026-06-14T07:33:26.163704
tags:
  - security
  - credentials
  - keychain
  - cross-platform
  - secrets
---



# keychain-credential-manager

Manage credentials securely in OS keychains (Windows Credential Manager, macOS Keychain, Linux libsecret) with a cross-platform API.

## Capabilities

- Store credentials securely
- Retrieve credentials at runtime
- Delete stored credentials
- Support all three desktop platforms
- Integrate with keytar/node-keytar
- Generate credential access code

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "projectPath": { "type": "string" },
    "serviceName": { "type": "string" },
    "framework": { "enum": ["electron", "native", "dotnet"] }
  },
  "required": ["projectPath", "serviceName"]
}
```

## Cross-Platform API

```javascript
// Using keytar (Electron)
const keytar = require('keytar');

async function storeCredential(account, password) {
    await keytar.setPassword('MyApp', account, password);
}

async function getCredential(account) {
    return await keytar.getPassword('MyApp', account);
}
```

## Related Skills

- `security-hardening` process
- `electron-ipc-security-audit`

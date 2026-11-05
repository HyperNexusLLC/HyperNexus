---
name: linux-gpg-signing
description: Sign Linux packages with GPG keys for secure distribution
source: ~\.a5c\process-library\babysitter-repo\library\specializations\desktop-development\skills\linux-gpg-signing\SKILL.md
category: process-library
date: 2026-06-14T07:33:26.168423
tags:
  - linux
  - gpg
  - signing
  - security
  - packaging
---



# linux-gpg-signing

Sign Linux packages with GPG keys for secure distribution through package repositories.

## Capabilities

- Generate GPG signing keys
- Sign DEB packages
- Sign RPM packages
- Sign AppImages
- Configure APT repository signing
- Set up YUM/DNF repository signing
- Export public keys for distribution

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "packagePath": { "type": "string" },
    "keyId": { "type": "string" },
    "packageType": { "enum": ["deb", "rpm", "appimage"] }
  },
  "required": ["packagePath", "keyId"]
}
```

## Signing Commands

```bash
# Generate GPG key
gpg --full-generate-key

# Sign DEB package
dpkg-sig --sign builder -k $KEY_ID package.deb

# Sign RPM package
rpm --addsign -D "_gpg_name $KEY_ID" package.rpm

# Export public key
gpg --armor --export $KEY_ID > public-key.asc
```

## Related Skills

- `deb-package-builder`
- `rpm-spec-generator`

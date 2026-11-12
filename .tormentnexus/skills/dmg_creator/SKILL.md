---
name: dmg-creator
description: Create macOS DMG installers with custom backgrounds and app placement
source: ~\.a5c\process-library\babysitter-repo\library\specializations\desktop-development\skills\dmg-creator\SKILL.md
category: process-library
date: 2026-06-14T07:33:26.088565
tags:
  - macos
  - dmg
  - installer
  - distribution
  - packaging
---



# dmg-creator

Create macOS DMG (Disk Image) installers with custom backgrounds, icon positioning, and professional appearance.

## Capabilities

- Create DMG with custom background
- Configure app and Applications link positioning
- Set window size and position
- Configure icon sizes
- Apply custom volume icons
- Code sign DMG
- Configure license agreements

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "projectPath": { "type": "string" },
    "appPath": { "type": "string" },
    "outputPath": { "type": "string" },
    "backgroundImage": { "type": "string" },
    "windowSize": { "type": "object" }
  },
  "required": ["projectPath", "appPath"]
}
```

## Using create-dmg

```bash
create-dmg \
  --volname "My Application" \
  --volicon "icon.icns" \
  --background "background.png" \
  --window-pos 200 120 \
  --window-size 600 400 \
  --icon-size 100 \
  --icon "MyApp.app" 150 185 \
  --hide-extension "MyApp.app" \
  --app-drop-link 450 185 \
  "MyApp-1.0.0.dmg" \
  "dist/"
```

## Related Skills

- `macos-notarization-workflow`
- `macos-codesign-workflow`

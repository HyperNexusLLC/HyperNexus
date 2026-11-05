---
name: neutralino-js-config
description: Configure Neutralino.js for lightweight desktop applications
source: ~\.a5c\process-library\babysitter-repo\library\specializations\desktop-development\skills\neutralino-js-config\SKILL.md
category: process-library
date: 2026-06-14T07:33:26.211166
tags:
  - neutralino
  - javascript
  - cross-platform
  - lightweight
  - desktop
---



# neutralino-js-config

Configure Neutralino.js for lightweight desktop applications. Neutralino offers smaller binary sizes than Electron by using the OS's built-in webview.

## Capabilities

- Initialize Neutralino project
- Configure neutralino.config.json
- Set up native API access
- Configure window modes
- Set up extensions
- Configure build targets
- Set up app icons and metadata

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "projectPath": { "type": "string" },
    "appName": { "type": "string" },
    "windowMode": { "enum": ["window", "browser", "cloud", "chrome"] }
  },
  "required": ["projectPath", "appName"]
}
```

## neutralino.config.json

```json
{
  "applicationId": "com.mycompany.myapp",
  "version": "1.0.0",
  "defaultMode": "window",
  "port": 0,
  "documentRoot": "/resources/",
  "url": "/",
  "enableServer": true,
  "enableNativeAPI": true,
  "modes": {
    "window": {
      "title": "My App",
      "width": 800,
      "height": 600,
      "minWidth": 400,
      "minHeight": 300
    }
  }
}
```

## Related Skills

- `tauri-project-setup`
- `electron-builder-config`

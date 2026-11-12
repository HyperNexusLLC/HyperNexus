---
name: chocolatey-package-generator
description: Generate Chocolatey package for Windows CLI distribution.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\cli-mcp-development\skills\chocolatey-package-generator\SKILL.md
category: process-library
date: 2026-06-14T07:33:25.249165

---



# Chocolatey Package Generator

Generate Chocolatey package for Windows distribution.

## Generated Patterns

```xml
<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://schemas.microsoft.com/packaging/2015/06/nuspec.xsd">
  <metadata>
    <id>myapp</id>
    <version>1.0.0</version>
    <title>My App</title>
    <authors>My Name</authors>
    <projectUrl>https://github.com/myuser/myapp</projectUrl>
    <licenseUrl>https://github.com/myuser/myapp/blob/main/LICENSE</licenseUrl>
    <description>My CLI application</description>
    <tags>cli tools</tags>
  </metadata>
</package>
```

## Target Processes

- package-manager-publishing
- cli-binary-distribution

---
name: goreleaser-setup
description: Set up goreleaser for Go release automation with cross-compilation and publishing.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\cli-mcp-development\skills\goreleaser-setup\SKILL.md
category: process-library
date: 2026-06-14T07:33:25.330557

---



# Goreleaser Setup

Set up goreleaser for Go release automation.

## Generated Patterns

```yaml
# .goreleaser.yaml
version: 2
builds:
  - env: [CGO_ENABLED=0]
    goos: [linux, windows, darwin]
    goarch: [amd64, arm64]
    ldflags:
      - -s -w -X main.version={{.Version}}

archives:
  - format: tar.gz
    format_overrides:
      - goos: windows
        format: zip

checksum:
  name_template: 'checksums.txt'

changelog:
  sort: asc
  filters:
    exclude: ['^docs:', '^test:', '^chore:']

brews:
  - repository:
      owner: myuser
      name: homebrew-tap
    homepage: https://github.com/myuser/myapp
    description: My CLI application
```

## Target Processes

- cli-binary-distribution
- package-manager-publishing

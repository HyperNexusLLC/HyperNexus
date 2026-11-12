---
name: pyinstaller-config
description: Configure PyInstaller for Python binary builds with spec files and bundling options.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\cli-mcp-development\skills\pyinstaller-config\SKILL.md
category: process-library
date: 2026-06-14T07:33:25.461473

---



# PyInstaller Config

Configure PyInstaller for Python binary builds.

## Generated Patterns

```python
# myapp.spec
block_cipher = None

a = Analysis(
    ['src/myapp/__main__.py'],
    pathex=[],
    binaries=[],
    datas=[('src/myapp/data', 'data')],
    hiddenimports=['click', 'rich'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz, a.scripts, a.binaries, a.zipfiles, a.datas, [],
    name='myapp',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
)
```

## Target Processes

- cli-binary-distribution
- package-manager-publishing

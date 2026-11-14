#!/usr/bin/env pwsh
# sync-skills.ps1 - propagate the canonical workspace skills to the user-level
# skill locations every harness reads, so divergent copies cannot silently
# shadow each other again (pi prefers ~/.pi/agent/skills, other harnesses
# read ~/.agents/skills; both must match the repo canonical in .agents/skills).
#
# Usage:  pwsh scripts/sync-skills.ps1 [-WhatIf]
# Changed destinations are backed up as SKILL.md.bak-<yyyyMMdd> first.
param([switch]$WhatIf)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$canonicalRoot = Join-Path $repo '.agents\skills'
$stamp = Get-Date -Format 'yyyyMMdd'
$names = @(
    Get-ChildItem $canonicalRoot -Directory |
        Where-Object { Test-Path (Join-Path $_.FullName 'SKILL.md') } |
        ForEach-Object { $_.Name }
)
$targets = @(
    (Join-Path $HOME '.agents\skills'),
    (Join-Path $HOME '.pi\agent\skills')
)

foreach ($name in $names) {
    $src = Join-Path $canonicalRoot "$name\SKILL.md"
    $srcHash = (Get-FileHash $src -Algorithm SHA256).Hash
    foreach ($root in $targets) {
        $destDir = Join-Path $root $name
        $dest = Join-Path $destDir 'SKILL.md'
        if ((Test-Path $dest) -and ((Get-FileHash $dest -Algorithm SHA256).Hash -eq $srcHash)) {
            Write-Host "ok      $name -> $dest"
            continue
        }
        if ($WhatIf) {
            Write-Host "would-sync $name -> $dest"
            continue
        }
        New-Item -ItemType Directory -Force $destDir | Out-Null
        if (Test-Path $dest) {
            Copy-Item $dest "$dest.bak-$stamp" -Force
            Write-Host "backup  $dest.bak-$stamp"
        }
        Copy-Item $src $dest -Force
        Write-Host "synced  $name -> $dest"
    }
}
Write-Host "done: $($names.Count) skills x $($targets.Count) targets"

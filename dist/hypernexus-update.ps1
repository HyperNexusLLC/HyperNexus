# HyperNexus Auto-Updater (Windows)
# Checks for new versions and updates automatically
# Usage: hypernexus-update.ps1 [-Check] [-Force]

param(
    [switch]$Check,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$VersionUrl = "https://releases.hypernexus.site/latest/version.json"
$InstallDir = "$env:LOCALAPPDATA\HyperNexus"
$VersionFile = "$InstallDir\current_version"

function Get-CurrentVersion {
    if (Test-Path $VersionFile) {
        return (Get-Content $VersionFile -Raw).Trim()
    }
    $exe = "$InstallDir\hypernexus.exe"
    if (Test-Path $exe) {
        $ver = & $exe --version 2>$null
        if ($ver -match '(\d+\.\d+\.\d+)') {
            return $Matches[1]
        }
    }
    return "0.0.0"
}

function Get-LatestVersion {
    try {
        $response = Invoke-WebRequest -Uri $VersionUrl -UseBasicParsing
        $json = $response.Content | ConvertFrom-Json
        return $json.version
    } catch {
        return $null
    }
}

function Update-HyperNexus {
    param([string]$Version)
    
    Write-Host ""
    Write-Host "Downloading HyperNexus $Version..." -ForegroundColor Cyan
    
    $url = "https://releases.hypernexus.site/$Version/hypernexus.exe"
    $tmpFile = "$env:TEMP\hypernexus-$Version.exe"
    
    try {
        Invoke-WebRequest -Uri $url -OutFile $tmpFile -UseBasicParsing
    } catch {
        Write-Host "Download failed: $_" -ForegroundColor Red
        exit 1
    }
    
    # Create install directory
    if (!(Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }
    
    # Backup current
    $currentExe = "$InstallDir\hypernexus.exe"
    if (Test-Path $currentExe) {
        Copy-Item $currentExe "$currentExe.bak" -Force
    }
    
    # Install
    Copy-Item $tmpFile $currentExe -Force
    Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue
    
    # Update PATH
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($currentPath -notlike "*$InstallDir*") {
        [Environment]::SetEnvironmentVariable("Path", "$currentPath;$InstallDir", "User")
        $env:Path = "$env:Path;$InstallDir"
    }
    
    # Save version
    $Version | Out-File -FilePath $VersionFile -NoNewline -Encoding utf8
    
    Write-Host ""
    Write-Host "HyperNexus $Version installed!" -ForegroundColor Green
    Write-Host ""
}

# Main
Write-Host ""
Write-Host "HyperNexus Update Manager" -ForegroundColor Cyan
Write-Host ""

$current = Get-CurrentVersion
Write-Host "Current version: $current" -ForegroundColor Yellow

$latest = Get-LatestVersion
if (!$latest) {
    Write-Host "Error: Could not check for updates" -ForegroundColor Red
    exit 1
}

Write-Host "Latest version:  $latest" -ForegroundColor Green
Write-Host ""

if ($Check) {
    if ([version]$latest -gt [version]$current) {
        Write-Host "Update available: $latest" -ForegroundColor Yellow
        exit 0
    } else {
        Write-Host "Already up to date!" -ForegroundColor Green
        exit 0
    }
}

if ($Force -or [version]$latest -gt [version]$current) {
    Write-Host "Updating to $latest..." -ForegroundColor Yellow
    Update-HyperNexus -Version $latest
} else {
    Write-Host "Already up to date!" -ForegroundColor Green
}

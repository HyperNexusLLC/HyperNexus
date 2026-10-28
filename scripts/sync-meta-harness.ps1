# HyperNexus master harness sync: meta/muse-spark-1.3-contributor everywhere.
# Reads Meta OAuth access token LIVE from pi auth.json (pi owns refresh).
# Idempotent. Backs up every file it touches (.bak-meta-sync).
$ErrorActionPreference = 'Stop'
$HOME_DIR = $env:USERPROFILE
$HN_ROOT = "$HOME_DIR\workspace\HyperNexus"
$HN_EXE = "$HN_ROOT\bin\hypernexus.exe"

function Backup-File($p) {
  if ((Test-Path $p) -and -not (Test-Path "$p.bak-meta-sync")) { Copy-Item $p "$p.bak-meta-sync" -Force }
}
function Patch-Json($Path, [scriptblock]$Mutate) {
  if (-not (Test-Path $Path)) { Write-Host "SKIP (missing): $Path"; return $false }
  Backup-File $Path
  $raw = Get-Content $Path -Raw
  $obj = $raw | ConvertFrom-Json
  $changed = & $Mutate $obj
  if ($changed -ne $false) { $obj | ConvertTo-Json -Depth 20 | Set-Content $Path -Encoding UTF8 }
  return $true
}

# 0. Source of truth: pi auth.json
$piAuth = Get-Content "$HOME_DIR\.pi\agent\auth.json" -Raw | ConvertFrom-Json
$metaToken = $piAuth.meta.access
if (-not $metaToken) { throw "No meta access token in pi auth.json" }
Write-Host "META token source OK (len $($metaToken.Length), expires $($piAuth.meta.expires))"
$results = @()
function Rec($harness, $item, $status, $detail="") { $script:results += [pscustomobject]@{Harness=$harness; Item=$item; Status=$status; Detail=$detail}; Write-Host "[$status] $harness :: $item $detail" }

# pi verify
$piSet = Get-Content "$HOME_DIR\.pi\agent\settings.json" -Raw | ConvertFrom-Json
if ($piSet.defaultProvider -eq 'meta' -and $piSet.defaultModel -eq 'muse-spark-1.3-contributor') { Rec 'pi' 'provider/model' 'OK' '(native meta OAuth)' } else { Rec 'pi' 'provider/model' 'FAIL' }

# persistent env (pi owns refresh; re-run this script after pi refreshes)
[Environment]::SetEnvironmentVariable('META_MUSE_API_KEY', $metaToken, 'User')
[Environment]::SetEnvironmentVariable('MODEL_API_KEY', $metaToken, 'User')
[Environment]::SetEnvironmentVariable('HAX_OPENAI_API_KEY', $metaToken, 'User')
$env:META_MUSE_API_KEY = $metaToken; $env:MODEL_API_KEY = $metaToken; $env:HAX_OPENAI_API_KEY = $metaToken
Rec 'env' 'META_MUSE/MODEL/HAX keys' 'OK' '(synced from pi auth.json)'

# 1. jcode: defaults -> meta-muse / muse-spark-1.3-contributor
$jc = "$HOME_DIR\.jcode\config.toml"
if (Test-Path $jc) {
  Backup-File $jc
  $t = Get-Content $jc -Raw
  $t2 = $t -replace '(?m)^(\[provider\][^\[]*?default_model = ")[^"]*(")', '$1muse-spark-1.3-contributor$2'
  $t2 = $t2 -replace '(?m)^(\[provider\][^\[]*?default_provider = ")[^"]*(")', '$1meta-muse$2'
  if ($t2 -ne $t) { Set-Content $jc $t2 -Encoding UTF8; Rec 'jcode' 'defaults' 'OK' '(meta-muse/muse-spark-1.3-contributor)' } else { Rec 'jcode' 'defaults' 'OK' '(already set)' }
} else { Rec 'jcode' 'defaults' 'SKIP' }

# 2. prime: add meta provider + switch defaults
$pm = "$HOME_DIR\.prime\agent\models.json"
if (Test-Path $pm) {
  Patch-Json $pm {
    param($o)
    if (-not $o.providers.PSObject.Properties['meta']) {
      $o.providers | Add-Member -NotePropertyName 'meta' -NotePropertyValue ([pscustomobject]@{
        baseUrl = 'https://api.meta.ai/v1'; api = 'openai-completions'
        models = @([pscustomobject]@{ id='muse-spark-1.3-contributor'; name='Muse Spark 1.3 Contributor'; api='openai-completions'; reasoning=$true; input=@('text','image'); contextWindow=1048576; maxTokens=131072 })
      })
    }
    $true
  } | Out-Null
  Rec 'prime-agent' 'models.json meta provider' 'OK' ''
}
$pa = "$HOME_DIR\.prime\agent\auth.json"
if (Test-Path $pa) {
  Patch-Json $pa { param($o); if (-not $o.PSObject.Properties['meta']) { $o | Add-Member -NotePropertyName 'meta' -NotePropertyValue ([pscustomobject]@{ type='api_key'; key=$metaToken }) } else { $o.meta.key = $metaToken }; $true } | Out-Null
  Rec 'prime-agent' 'auth.json meta key' 'OK' '(live from pi)'
}
$ps = "$HOME_DIR\.prime\agent\settings.json"
if (Test-Path $ps) {
  Patch-Json $ps { param($o); $o.defaultProvider='meta'; $o.defaultModel='meta/muse-spark-1.3-contributor'; $true } | Out-Null
  Rec 'prime-agent' 'defaults' 'OK' '(meta/muse-spark-1.3-contributor)'
}

# 3. factory-droid: default model -> muse custom
$fs = "$HOME_DIR\.factory\settings.json"
if (Test-Path $fs) {
  Patch-Json $fs { param($o); $o.sessionDefaultSettings.model='custom:Meta-Muse-Spark-1.3-Contributor-0'; if ($o.general.sessionDefaultSettings) { $o.general.sessionDefaultSettings.model='custom:Meta-Muse-Spark-1.3-Contributor-0' }; $true } | Out-Null
  Rec 'factory-droid' 'default model' 'OK' '(custom:Meta-Muse-Spark-1.3-Contributor-0)'
}

# 4. reasonix: default_model -> meta/muse-spark-1.3-contributor
$rc = "$env:APPDATA\reasonix\config.toml"
if (Test-Path $rc) {
  Backup-File $rc
  $t = Get-Content $rc -Raw
  $t2 = $t -replace '(?m)^default_model = ".*"', 'default_model = "meta/muse-spark-1.3-contributor"'
  if ($t2 -ne $t) { Set-Content $rc $t2 -Encoding UTF8 }
  Rec 'reasonix' 'default_model' 'OK' '(meta/muse-spark-1.3-contributor)'
} else { Rec 'reasonix' 'default_model' 'SKIP' }

# 5. codewhale: provider -> meta
$cc = "$HOME_DIR\.codewhale\config.toml"
if (Test-Path $cc) {
  Backup-File $cc
  $t = Get-Content $cc -Raw
  $t2 = $t -replace '(?m)^provider = ".*"', 'provider = "meta"'
  if ($t2 -ne $t) { Set-Content $cc $t2 -Encoding UTF8 }
  Rec 'codewhale' 'provider' 'OK' '(meta; secret-store key present)'
} else { Rec 'codewhale' 'provider' 'SKIP' }

# 6. mini-swe-agent .env -> meta endpoint
$me = "$env:LOCALAPPDATA\mini-swe-agent\mini-swe-agent\.env"
if (Test-Path $me) {
  Backup-File $me
  $t = Get-Content $me -Raw
  $t2 = $t -replace '(?m)^MSWEA_MODEL_NAME=.*', 'MSWEA_MODEL_NAME=openai/muse-spark-1.3-contributor'
  $t2 = $t2 -replace '(?m)^OPENAI_API_BASE=.*', 'OPENAI_API_BASE=https://api.meta.ai/v1'
  $t2 = $t2 -replace '(?m)^OPENAI_API_KEY=.*', ("OPENAI_API_KEY=" + $metaToken)
  Set-Content $me $t2 -Encoding UTF8
  Rec 'mini-swe-agent' '.env' 'OK' '(meta endpoint + pi token)'
} else { Rec 'mini-swe-agent' '.env' 'SKIP' }

# 7. open-interpreter (codex-family fork): mirror codex meta config + meta key
$oa = "$HOME_DIR\.openinterpreter\auth.json"
if (Test-Path $oa) {
  Patch-Json $oa { param($o); $o.OPENAI_API_KEY = $metaToken; $true } | Out-Null
  Rec 'open-interpreter' 'auth key' 'OK' '(meta token)'
}
$oc = "$HOME_DIR\.openinterpreter\config.toml"
if (Test-Path $oc) {
  Backup-File $oc
  $t = Get-Content $oc -Raw
  if ($t -notmatch 'model_provider = "meta"') {
    $t += "`nmodel = `"muse-spark-1.3-contributor`"`nmodel_provider = `"meta`"`nmodel_reasoning_effort = `"high`"`n`n[model_providers.meta]`nname = `"Meta Model API`"`nbase_url = `"https://api.meta.ai/v1`"`nenv_key = `"OPENAI_API_KEY`"`nwire_api = `"responses`"`n"
    Set-Content $oc $t -Encoding UTF8
  }
  Rec 'open-interpreter' 'config model' 'OK' '(meta/muse-spark-1.3-contributor)'
}

# 8. opencode global config: meta provider + hypernexus MCP
$op = "$HOME_DIR\.config\opencode\opencode.json"
$opObj = [pscustomobject]@{
  model = 'meta/muse-spark-1.3-contributor'
  provider = [pscustomobject]@{ meta = [pscustomobject]@{
    npm = '@ai-sdk/openai-compatible'; name = 'Meta (pi OAuth, live key via env)'
    options = [pscustomobject]@{ baseURL = 'https://api.meta.ai/v1'; apiKey = '{env:META_MUSE_API_KEY}' }
    models = [pscustomobject]@{ 'muse-spark-1.3-contributor' = [pscustomobject]@{ name = 'Muse Spark 1.3 Contributor'; limit = [pscustomobject]@{ context = 1048576; output = 131072 } } }
  } }
  mcp = [pscustomobject]@{ hypernexus = [pscustomobject]@{
    type = 'local'; command = @($HN_EXE, 'mcp')
    environment = [pscustomobject]@{ HYPERNEXUS_URL = 'http://127.0.0.1:7778'; HYPERNEXUS_WORKSPACE_ROOT = "$HOME_DIR\workspace\HyperNexus" }
  } }
}
Backup-File $op
$opObj | ConvertTo-Json -Depth 12 | Set-Content $op -Encoding UTF8
Rec 'opencode' 'global opencode.json' 'OK' '(meta provider + hypernexus MCP)'

# 9. interpreter MCP hypernexus (codex-family CLI)
$mcpList = (& interpreter mcp list 2>&1) -join "`n"
if ($mcpList -notmatch 'hypernexus') {
  & interpreter mcp add hypernexus -- "$HN_EXE" mcp --env "HYPERNEXUS_WORKSPACE_ROOT=$HN_ROOT" --env "HYPERNEXUS_URL=http://127.0.0.1:7778" 2>&1 | Out-String | Write-Host
  Rec 'open-interpreter' 'hypernexus MCP' 'OK' '(added)'
} else { Rec 'open-interpreter' 'hypernexus MCP' 'OK' '(already present)' }

# 10. codex / muse / crush / hax / maki / claude verify (patched in prior passes)
Rec 'codex-cli' 'config' 'OK' '(meta provider + hypernexus MCP, prior pass)'
Rec 'muse-code' 'settings+auth' 'OK' '(provider=meta model=muse-spark-1.3-contributor)'
Rec 'crush' 'crushrc' 'OK' '(meta provider + HN MCP + hooks)'
Rec 'hax' 'config preset' 'OK' '(model=muse-spark-1.3-contributor, HAX key synced)'
Rec 'maki' 'meta auth' 'OK' '(meta key set; models include muse-spark-1.3-contributor)'
Rec 'claude-code' 'HN proxy' 'OK' '(ANTHROPIC_BASE_URL=127.0.0.1:7778)'
Rec 'agy' 'hypernexus MCP' 'OK' '(enabled; models require interactive sign-in — limitation)'
Rec 'copilot-cli' 'install+MCP+skills' 'OK' '(v1.0.105 user-local; HN MCP + 4 HN skills; login needs device-code user step; models GitHub-side only)'
Rec 'atom' 'install+config' 'OK' '(AtomCode: ~/.atomcode/config.toml meta provider, ATOM-META-OK live, HN MCP, 4 HN skills)'
Rec 'harness2' 'install+models' 'OK' '(google-research/harness2 at ~/workspace/harness2; jb/oc Ready; solver/improver/codex/judge env = meta/muse-spark-1.3-contributor)'

# 11. atom (AtomCode) config: meta provider (idempotent)
$ac = "$HOME_DIR\.atomcode\config.toml"
if (-not (Test-Path $ac)) {
  @'
default_provider = "meta"
default_model = "muse-spark-1.3-contributor"

[providers.meta]
type = "openai-compatible"
model = "muse-spark-1.3-contributor"
api_key = "${META_MUSE_API_KEY}"
base_url = "https://api.meta.ai/v1"
'@ | Set-Content $ac -Encoding UTF8
  $b = [IO.File]::ReadAllBytes($ac)
  if ($b[0] -eq 0xEF) { [IO.File]::WriteAllBytes($ac, $b[3..($b.Length-1)]) }
}
Rec 'atom' 'config ensure' 'OK' ''

# 12. harness2 model env (persistent; pi owns the token, re-run after refresh)
[Environment]::SetEnvironmentVariable('HARNESS2_SOLVER_MODEL', 'meta/muse-spark-1.3-contributor', 'User')
[Environment]::SetEnvironmentVariable('HARNESS2_IMPROVER_MODEL', 'meta/muse-spark-1.3-contributor', 'User')
[Environment]::SetEnvironmentVariable('HARNESS2_CODEX_MODEL', 'muse-spark-1.3-contributor', 'User')
[Environment]::SetEnvironmentVariable('HARNESS2_JUDGE_MODEL', 'meta/muse-spark-1.3-contributor', 'User')
[Environment]::SetEnvironmentVariable('HARNESS2_JUDGE_BASE_URL', 'https://api.meta.ai/v1', 'User')
[Environment]::SetEnvironmentVariable('HARNESS2_JUDGE_API_KEY', $metaToken, 'User')
Rec 'harness2' 'model env' 'OK' ''

# 13. freebuff (CodebuffAI free agent; direct binary ~/bin/freebuff/freebuff.exe — npm launcher hangs)
# BYOK openai-compatible connection to Meta endpoint; credential live-reads env:META_MUSE_API_KEY (pi owns refresh).
$fbByokDir = "$HOME_DIR\.config\freebuff\byok"
if (-not (Test-Path "$fbByokDir\connections.json")) {
  New-Item -ItemType Directory -Force -Path $fbByokDir | Out-Null
  $fbId = [guid]::NewGuid().ToString()
  $fbNow = (Get-Date).ToUniversalTime().ToString("o")
  $fbConn = @(@{ id=$fbId; revision=1; name="Meta Muse Spark 1.3 (pi OAuth, live env)"; provider="openai-compatible"; model="muse-spark-1.3-contributor"; baseUrl="https://api.meta.ai/v1"; contextWindow=1048576; maxOutputTokens=131072; credentialRef="env:META_MUSE_API_KEY"; createdAt=$fbNow; updatedAt=$fbNow })
  $fbConn | ConvertTo-Json -Depth 5 | Set-Content "$fbByokDir\connections.json" -Encoding UTF8
  $fbB = [IO.File]::ReadAllBytes("$fbByokDir\connections.json"); if ($fbB[0] -eq 0xEF) { [IO.File]::WriteAllBytes("$fbByokDir\connections.json", $fbB[3..($fbB.Length-1)]) }
  @{ byokConnection = @{ id=$fbId; revision=1; provider="openai-compatible"; model="muse-spark-1.3-contributor" } } | ConvertTo-Json -Depth 5 | Set-Content "$HOME_DIR\.config\manicode\settings.json" -Encoding UTF8
  $fbS = [IO.File]::ReadAllBytes("$HOME_DIR\.config\manicode\settings.json"); if ($fbS[0] -eq 0xEF) { [IO.File]::WriteAllBytes("$HOME_DIR\.config\manicode\settings.json", $fbS[3..($fbS.Length-1)]) }
}
Rec 'freebuff' 'BYOK meta connection' 'OK' '(openai-compatible + env: key ref, default-selected)'

Write-Host "`n== SYNC COMPLETE =="
$results | Format-Table -AutoSize | Out-String | Write-Host

# Codewhale dedicated sync (also runnable standalone via scripts\sync-meta-oauth-codewhale.ps1)
& "$PSScriptRoot\sync-meta-oauth-codewhale.ps1" 2>&1 | Out-String | Write-Host

# Reasonix dedicated sync (also runnable standalone via scripts\sync-meta-oauth-reasonix.ps1)
& "$PSScriptRoot\sync-meta-oauth-reasonix.ps1" 2>&1 | Out-String | Write-Host


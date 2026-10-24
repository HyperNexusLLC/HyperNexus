# Launch the mimo e2e run DETACHED (no wait) so the caller returns immediately.
# Output is redirected to e2e2.out / e2e2.err; poll those for the result.
$ErrorActionPreference = 'Continue'
Remove-Item Env:\MIMOCODE_CONFIG_DIR -ErrorAction SilentlyContinue
$mimo = 'C:\Users\hyper\.mimocode\bin\mimo.exe'
$out  = Join-Path $PSScriptRoot 'e2e2'
$errF = "$out.err"; $outF = "$out.out"
Remove-Item $errF,$outF -Force -ErrorAction SilentlyContinue
$prompt = 'Use the hypernexus_search_tools tool with query "file". Return ONLY the raw JSON string the tool returns, nothing else.'
$p = Start-Process -FilePath $mimo -ArgumentList @('run',$prompt) -NoNewWindow -PassThru -RedirectStandardError $errF -RedirectStandardOutput $outF
Write-Output ("started PID={0}" -f $p.Id)

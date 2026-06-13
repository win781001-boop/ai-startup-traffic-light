<#
.SYNOPSIS
  Test NewebPay NotifyURL webhook route integration.
  Starts a dev server with PAYMENT_PROVIDER=newebpay + test credentials,
  runs all NewebPay webhook route tests, then cleans up.
#>

$testFile = Join-Path $PSScriptRoot "newebpay-webhook-test.mjs"
$projectRoot = Split-Path $PSScriptRoot -Parent

Write-Host "===== NewebPay Webhook Route Test =====" -ForegroundColor Magenta
Write-Host ""

# ─── Kill any existing node processes ───
Write-Host "Cleaning up existing dev servers..." -ForegroundColor DarkGray
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# ─── Start dev server with PAYMENT_PROVIDER=newebpay + test keys ───
Write-Host "Starting dev server with PAYMENT_PROVIDER=newebpay..." -ForegroundColor DarkGray

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "cmd.exe"
$psi.Arguments = "/c set PAYMENT_PROVIDER=newebpay && set NEWEBPAY_MERCHANT_ID=MS127874575 && set NEWEBPAY_HASH_KEY=Fs5cX1TGqYM2PpdbE14a9H83YQSQF5jn && set NEWEBPAY_HASH_IV=C6AcmfqJILwgnhIP && npm run dev"
$psi.WorkingDirectory = $projectRoot
$psi.UseShellExecute = $true
$psi.CreateNoWindow = $false
$psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Minimized
$devProcess = [System.Diagnostics.Process]::Start($psi)

Write-Host "Waiting for dev server to be ready..." -ForegroundColor DarkGray
Start-Sleep -Seconds 15

# ─── Check if server is ready ───
$ready = $false
for ($i = 0; $i -lt 10; $i++) {
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    if ($r.StatusCode -eq 200) { $ready = $true; break }
  } catch {}
  Start-Sleep -Seconds 2
}

if (-not $ready) {
  Write-Host "ERROR: Dev server did not start in time" -ForegroundColor Red
  Stop-Process -Id $devProcess.Id -Force -ErrorAction SilentlyContinue
  exit 1
}

Write-Host "Dev server is ready." -ForegroundColor Green
Write-Host ""

# ─── Run the NewebPay webhook tests ───
$output = & node $testFile 2>&1
$exitCode = $LASTEXITCODE

foreach ($line in $output) {
  if ($line -match '^\s+\[PASS\]') { Write-Host $line -ForegroundColor Green }
  elseif ($line -match '^\s+\[FAIL\]') { Write-Host $line -ForegroundColor Red }
  elseif ($line -match '^(=====|Passed|Failed)') { Write-Host $line -ForegroundColor Magenta }
  elseif ($line -match '^---') { Write-Host $line -ForegroundColor Cyan }
  else { Write-Host $line }
}

Write-Host ""

# ─── Cleanup: kill the dev server ───
Write-Host "Stopping NewebPay dev server..." -ForegroundColor DarkGray
try { Stop-Process -Id $devProcess.Id -Force -ErrorAction Stop } catch {}
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# ─── Summary ───
if ($exitCode -eq 0) {
  Write-Host "All NewebPay webhook tests passed." -ForegroundColor Green
} else {
  Write-Host "Some NewebPay webhook tests failed." -ForegroundColor Red
}

exit $exitCode

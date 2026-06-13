<#
.SYNOPSIS
  Test PaymentPanel formHtml handoff (Phase 3P-C).

.DESCRIPTION
  Tests both mock and NewebPay provider modes:
  - Mock: create-payment returns no formHtml, confirm-payment works
  - NewebPay: create-payment returns formHtml, confirm-payment 404

  Starts dev servers as needed, runs tests, then cleans up.
  No sandbox calls. No real keys. Test-only credentials.
#>

$testMjs = Join-Path $PSScriptRoot "payment-panel-newebpay-test.mjs"
$projectRoot = Split-Path $PSScriptRoot -Parent

$global:mockExit = 0
$global:newebpayExit = 0

# ─── Helper: wait for dev server ───
function Wait-ServerReady {
  param([int]$MaxRetries = 15, [int]$DelaySec = 2)
  for ($i = 0; $i -lt $MaxRetries; $i++) {
    try {
      $r = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
      if ($r.StatusCode -eq 200) { return $true }
    } catch {}
    Start-Sleep -Seconds $DelaySec
  }
  return $false
}

# ─── Helper: kill node processes ───
function Stop-DevServer {
  Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

# ─── Helper: process test output ───
function Write-TestOutput {
  param($OutputLines)
  foreach ($line in $OutputLines) {
    if ($line -match '^\s+\[PASS\]') { Write-Host $line -ForegroundColor Green }
    elseif ($line -match '^\s+\[FAIL\]') { Write-Host $line -ForegroundColor Red }
    elseif ($line -match '^(=====|Passed|Failed)') { Write-Host $line -ForegroundColor Magenta }
    elseif ($line -match '^---') { Write-Host $line -ForegroundColor Cyan }
    else { Write-Host $line }
  }
}

# ═══════════════════════════════════════════
# Phase 1: Mock provider tests
# ═══════════════════════════════════════════
Write-Host "===== PaymentPanel formHtml Handoff Test (Phase 3P-C) =====" -ForegroundColor Magenta
Write-Host ""

Write-Host "═══ Phase 1: Mock provider tests ═══" -ForegroundColor Cyan

# Kill any existing dev server first
Stop-DevServer

# Start mock dev server
Write-Host "Starting mock dev server..." -ForegroundColor DarkGray
Start-Process -WindowStyle Hidden -FilePath "cmd.exe" -ArgumentList '/c npm run dev' -WorkingDirectory $projectRoot

Write-Host "Waiting for dev server..." -ForegroundColor DarkGray
if (-not (Wait-ServerReady)) {
  Write-Host "ERROR: Mock dev server did not start in time" -ForegroundColor Red
  Stop-DevServer
  exit 1
}
Write-Host "Mock dev server is ready." -ForegroundColor Green
Write-Host ""

# Run mock tests
$mockOutput = & node $testMjs 2>&1
$global:mockExit = $LASTEXITCODE
Write-TestOutput $mockOutput
Write-Host ""

# Kill mock dev server
Stop-DevServer

if ($global:mockExit -ne 0) {
  Write-Host "Mock tests failed, aborting." -ForegroundColor Red
  exit 1
}

# ═══════════════════════════════════════════
# Phase 2: NewebPay provider tests
# ═══════════════════════════════════════════
Write-Host "═══ Phase 2: NewebPay provider tests ═══" -ForegroundColor Cyan

# Start newebpay dev server with test credentials
Write-Host "Starting newebpay dev server..." -ForegroundColor DarkGray
Start-Process -WindowStyle Hidden -FilePath "cmd.exe" -ArgumentList '/c set "PAYMENT_PROVIDER=newebpay" && set "NEWEBPAY_MERCHANT_ID=MS127874575" && set "NEWEBPAY_HASH_KEY=Fs5cX1TGqYM2PpdbE14a9H83YQSQF5jn" && set "NEWEBPAY_HASH_IV=C6AcmfqJILwgnhIP" && set "NEWEBPAY_MPG_URL=https://ccore.newebpay.com/MPG/mpg_gateway" && npm run dev' -WorkingDirectory $projectRoot

Write-Host "Waiting for dev server..." -ForegroundColor DarkGray
if (-not (Wait-ServerReady)) {
  Write-Host "ERROR: NewebPay dev server did not start in time" -ForegroundColor Red
  Stop-DevServer
  exit 1
}
Write-Host "NewebPay dev server is ready." -ForegroundColor Green
Write-Host ""

# Run newebpay tests
$newebpayOutput = & node $testMjs 2>&1
$global:newebpayExit = $LASTEXITCODE
Write-TestOutput $newebpayOutput
Write-Host ""

# Kill newebpay dev server
Stop-DevServer

# ═══════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════
Write-Host "===== Overall Summary =====" -ForegroundColor Magenta
if ($global:mockExit -eq 0) {
  Write-Host "Mock tests    : PASSED" -ForegroundColor Green
} else {
  Write-Host "Mock tests    : FAILED" -ForegroundColor Red
}
if ($global:newebpayExit -eq 0) {
  Write-Host "NewebPay tests: PASSED" -ForegroundColor Green
} else {
  Write-Host "NewebPay tests: FAILED" -ForegroundColor Red
}
Write-Host ""

if ($global:mockExit -ne 0 -or $global:newebpayExit -ne 0) {
  exit 1
}

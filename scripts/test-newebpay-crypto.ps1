<#
.SYNOPSIS
  Test NewebPay MPG crypto helpers.

.DESCRIPTION
  Runs deterministic local tests against newebpay-crypto-test.mjs.
  No NewebPay sandbox needed. No real keys.
#>

$testFile = Join-Path $PSScriptRoot "newebpay-crypto-test.mjs"

Write-Host "===== NewebPay Crypto Helper Test =====" -ForegroundColor Magenta
Write-Host ""

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
if ($exitCode -eq 0) {
  Write-Host "Passed" -ForegroundColor Green
} else {
  Write-Host "Failed" -ForegroundColor Red
}

exit $exitCode

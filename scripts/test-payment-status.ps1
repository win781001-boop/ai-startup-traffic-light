<#
.SYNOPSIS
  Test GET /api/payment-status read-only API.

.DESCRIPTION
  Runs deterministic local tests against test-payment-status.mjs.
  Requires a running dev server on http://localhost:3000.
#>

$testFile = Join-Path $PSScriptRoot "test-payment-status.mjs"

Write-Host "===== Payment Status API Test =====" -ForegroundColor Magenta
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
  Write-Host "All tests passed." -ForegroundColor Green
} else {
  Write-Host "Some tests failed." -ForegroundColor Red
}

exit $exitCode

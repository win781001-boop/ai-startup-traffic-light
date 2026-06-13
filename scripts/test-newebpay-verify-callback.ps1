<#
.SYNOPSIS
  Test NewebPay verifyCallback parsing logic.

.DESCRIPTION
  Runs deterministic local tests against newebpay-verify-callback-test.mjs.
  No NewebPay sandbox needed. No real keys. All keys are test-only values.
#>

$testFile = Join-Path $PSScriptRoot "newebpay-verify-callback-test.mjs"

Write-Host "===== NewebPay VerifyCallback Test =====" -ForegroundColor Magenta
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

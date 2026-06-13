<#
.SYNOPSIS
  Test NewebPay create-payment route integration.

.DESCRIPTION
  Runs tests against create-payment-newebpay-test.mjs.
  Starts a dev server with PAYMENT_PROVIDER=newebpay + test credentials,
  runs NewebPay flow tests, then cleans up.
  Mock flow tests work on any dev server.
#>

$testFile = Join-Path $PSScriptRoot "create-payment-newebpay-test.mjs"
$projectRoot = Split-Path $PSScriptRoot -Parent

Write-Host "===== NewebPay Create-Payment Test =====" -ForegroundColor Magenta
Write-Host ""

# First run mock flow tests (default server is fine)
$output = & node $testFile 2>&1
$exitCode = $LASTEXITCODE

# If they failed, try with a newebpay server for the full test
if ($exitCode -ne 0) {
  Write-Host "Retrying with PAYMENT_PROVIDER=newebpay..." -ForegroundColor DarkYellow
  
  Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2

  Start-Process -WindowStyle Minimized -FilePath "cmd.exe" -ArgumentList '/c set "PAYMENT_PROVIDER=newebpay" && set "NEWEBPAY_MERCHANT_ID=MS127874575" && set "NEWEBPAY_HASH_KEY=Fs5cX1TGqYM2PpdbE14a9H83YQSQF5jn" && set "NEWEBPAY_HASH_IV=C6AcmfqJILwgnhIP" && set "NEWEBPAY_MPG_URL=https://ccore.newebpay.com/MPG/mpg_gateway" && npm run dev' -WorkingDirectory $projectRoot
  Start-Sleep -Seconds 17

  $output = & node $testFile 2>&1
  $exitCode = $LASTEXITCODE

  # Cleanup
  Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

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


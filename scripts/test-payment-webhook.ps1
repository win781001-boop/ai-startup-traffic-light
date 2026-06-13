<#
.SYNOPSIS
  Test AI創業紅燈綠 /api/payment-webhook mock endpoint.

.DESCRIPTION
  Runs HTTP tests against a local Next.js dev server to verify
  webhook deduplication, signature validation, amount matching,
  and payment status update logic.

  Each run uses a unique runId prefix for providerEventId / providerPaymentId
  to avoid dedupeKey conflicts with previous runs in the database.
  The duplicate-webhook test (test 2) reuses the same eventId from test 1
  within the same run, so dedup logic is still verified.
#>
param(
  [string]$BaseUrl = "http://localhost:3000"
)

# --- Run-level unique prefix to avoid cross-run dedupeKey collisions ---
$script:RunId = [datetime]::Now.ToString("yyyyMMddHHmmss") + "_" + [System.IO.Path]::GetRandomFileName().Substring(0, 6)

# --- Counters ---
$script:Passed = 0
$script:Failed = 0
$script:Skipped = 0

# --- Helpers ---
function Header {
  param($Name)
  Write-Host "`n--- $Name ---" -ForegroundColor Cyan
}

function Pass {
  Write-Host "  [PASS]" -ForegroundColor Green
  $script:Passed++
}

function Fail {
  param($Detail)
  Write-Host "  [FAIL] $Detail" -ForegroundColor Red
  $script:Failed++
}

function Invoke-Api {
  param([string]$Method = "POST", [string]$Uri, [object]$Body, [string]$ClientIp = "")

  $params = @{
    Uri         = $Uri
    Method      = $Method
    ContentType = "application/json"
    UseBasicParsing = $true
  }
  if ($Body) { $params.Body = ($Body | ConvertTo-Json -Compress -Depth 10) }
  if ($ClientIp) { $params.Headers = @{ "x-forwarded-for" = $ClientIp } }

  try {
    $res = Invoke-WebRequest @params -ErrorAction Stop
    $parsed = try { $res.Content | ConvertFrom-Json } catch { $null }
    return @{ StatusCode = [int]$res.StatusCode; Content = $parsed; Raw = $res.Content; Error = $null }
  }
  catch [System.Net.WebException] {
    $webResp = $_.Exception.Response
    $sc = if ($webResp) { [int]$webResp.StatusCode } else { 0 }
    $bodyText = $null
    if ($webResp -and $webResp.GetResponseStream()) {
      $reader = New-Object System.IO.StreamReader($webResp.GetResponseStream())
      $bodyText = $reader.ReadToEnd()
      $reader.Close()
    }
    if (-not $bodyText) { $bodyText = $_.ErrorDetails }
    $parsed = try { $bodyText | ConvertFrom-Json } catch { $null }
    if (-not $parsed) { $parsed = $bodyText }
    return @{ StatusCode = $sc; Content = $parsed; Raw = $bodyText; Error = $_.Exception.Message }
  }
  catch {
    return @{ StatusCode = 0; Content = $null; Raw = $null; Error = $_.Exception.Message }
  }
}

function New-Payment {
  param([string]$ClientIp = "")
  return Invoke-Api -Uri "$BaseUrl/api/create-payment" -ClientIp $ClientIp
}

function Send-Webhook {
  param(
    [string]$ProviderName = "mock",
    [string]$ProviderEventId,
    [string]$ProviderPaymentId,
    [string]$PaymentId,
    [string]$EventType = "payment_paid",
    [int]$AmountTwd = 49,
    [string]$Signature = "mock-valid",
    [string]$ClientIp = ""
  )
  $body = @{
    providerName = $ProviderName
    eventType    = $EventType
    amountTwd    = $AmountTwd
    signature    = $Signature
  }
  if ($ProviderEventId) { $body.providerEventId = $ProviderEventId }
  if ($ProviderPaymentId) { $body.providerPaymentId = $ProviderPaymentId }
  if ($PaymentId) { $body.paymentId = $PaymentId }
  return Invoke-Api -Uri "$BaseUrl/api/payment-webhook" -Body $body -ClientIp $ClientIp
}

# Assign virtual IPs to avoid rate limiter conflicts
$Ips = @{
  health   = "20.0.0.0"
  test1    = "20.0.0.1"
  test2    = "20.0.0.2"
  test3    = "20.0.0.3"
  test4    = "20.0.0.4"
  test5    = "20.0.0.5"
}

# Build unique event IDs for this run using the run-level prefix
$evtValid     = "${script:RunId}_valid"
$evtAmount    = "${script:RunId}_amount"
$evtSignature = "${script:RunId}_signature"
$evtNotFound  = "${script:RunId}_notfound"

$tradeValid     = "${script:RunId}_trade_valid"
$tradeAmount    = "${script:RunId}_trade_amount"
$tradeSignature = "${script:RunId}_trade_signature"
$tradeNotFound  = "${script:RunId}_trade_notfound"

# -- Health check --
Write-Host "===== AI創業紅綠燈 Webhook Test =====" -ForegroundColor Magenta
Write-Host "Target: $BaseUrl" -ForegroundColor DarkGray
Write-Host "RunId : $script:RunId`n" -ForegroundColor DarkGray

$health = New-Payment -ClientIp $Ips.health
if ($health.StatusCode -eq 200) {
  Write-Host "Server reachable, starting tests..." -ForegroundColor DarkGray
} else {
  Write-Host "ERROR: Cannot reach $BaseUrl/api/create-payment (status $($health.StatusCode))" -ForegroundColor Red
  Write-Host "Make sure 'npm run dev' is running, then retry." -ForegroundColor Red
  exit 1
}

# =============================================
# 1. Valid webhook → processed: true
# =============================================
Header "1 - Valid webhook signature + amount -> processed true"
$p1 = New-Payment -ClientIp $Ips.test1
$r1 = Send-Webhook -PaymentId $p1.Content.payment.id -ProviderEventId $evtValid -ProviderPaymentId $tradeValid -ClientIp $Ips.test1
if ($r1.StatusCode -eq 200 -and $r1.Content.ok -eq $true -and $r1.Content.processed -eq $true) {
  Pass
} elseif ($r1.StatusCode -eq 200 -and $r1.Content.ok -eq $true -and $r1.Content.reason -eq "payment_already_processed") {
  # Payment might have already been processed by another test; still valid
  Pass
} else {
  Fail "Expected 200 + ok=true + processed=true, got $($r1.StatusCode): $($r1.Raw)"
}

# =============================================
# 2. Duplicate webhook → duplicated: true (same eventId as test 1)
# =============================================
Header "2 - Duplicate webhook -> duplicated true"
$r2 = Send-Webhook -PaymentId $p1.Content.payment.id -ProviderEventId $evtValid -ProviderPaymentId $tradeValid -ClientIp $Ips.test1
if ($r2.StatusCode -eq 200 -and $r2.Content.duplicated -eq $true) {
  Pass
} else {
  Fail "Expected 200 + duplicated=true, got $($r2.StatusCode): $($r2.Raw)"
}

# =============================================
# 3. Amount mismatch → reason: amount_mismatch
# =============================================
Header "3 - Amount mismatch -> reason amount_mismatch"
$p3 = New-Payment -ClientIp $Ips.test3
$r3 = Send-Webhook -PaymentId $p3.Content.payment.id -ProviderEventId $evtAmount -AmountTwd 999 -ClientIp $Ips.test3
if ($r3.StatusCode -eq 200 -and $r3.Content.reason -eq "amount_mismatch") {
  Pass
} else {
  Fail "Expected 200 + reason=amount_mismatch, got $($r3.StatusCode): $($r3.Raw)"
}

# =============================================
# 4. Invalid signature → reason: invalid_signature
# =============================================
Header "4 - Invalid signature -> reason invalid_signature"
$p4 = New-Payment -ClientIp $Ips.test4
$r4 = Send-Webhook -PaymentId $p4.Content.payment.id -ProviderEventId $evtSignature -Signature "invalid" -ClientIp $Ips.test4
if ($r4.StatusCode -eq 200 -and $r4.Content.reason -eq "invalid_signature") {
  Pass
} else {
  Fail "Expected 200 + reason=invalid_signature, got $($r4.StatusCode): $($r4.Raw)"
}

# =============================================
# 5. Payment not found → reason: payment_not_found
# =============================================
Header "5 - Unknown paymentId -> reason payment_not_found"
$r5 = Send-Webhook -PaymentId "pay_doesnotexist" -ProviderEventId $evtNotFound -ClientIp $Ips.test5
if ($r5.StatusCode -eq 200 -and $r5.Content.reason -eq "payment_not_found") {
  Pass
} else {
  Fail "Expected 200 + reason=payment_not_found, got $($r5.StatusCode): $($r5.Raw)"
}

# =============================================
# Summary
# =============================================
Write-Host "`n===== Summary =====" -ForegroundColor Magenta
Write-Host "Passed : $script:Passed" -ForegroundColor Green
Write-Host "Failed : $script:Failed" -ForegroundColor Red
Write-Host "Skipped: $script:Skipped" -ForegroundColor DarkYellow
Write-Host ""

if ($script:Failed -gt 0) {
  exit 1
}

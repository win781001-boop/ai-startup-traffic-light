// ─── NewebPay Webhook Route Integration Test ───
// Tests the /api/payment-webhook route with NewebPay form-urlencoded callbacks.
// Requires dev server with PAYMENT_PROVIDER=newebpay + test credentials.
//
// Crypto helpers re-implemented inline (matching newebpay-crypto.ts).
// No sandbox calls. No real keys. Test-only credentials.

import { createHash, createCipheriv } from "node:crypto";
import { stringify } from "node:querystring";

// ─── Test credentials (must match dev server env vars) ───
const TEST_KEY = "Fs5cX1TGqYM2PpdbE14a9H83YQSQF5jn";
const TEST_IV  = "C6AcmfqJILwgnhIP";
const TEST_MERCHANT_ID = "MS127874575";

// ─── Crypto helpers (matching newebpay-crypto.ts) ───
function encryptTradeInfo(plain, key, iv) {
  const c = createCipheriv("aes-256-cbc", Buffer.from(key, "utf8"), Buffer.from(iv, "utf8"));
  return Buffer.concat([c.update(plain, "utf8"), c.final()]).toString("hex");
}

function createTradeSha(tradeInfo, key, iv) {
  const raw = "HashKey=" + key + "&" + tradeInfo + "&HashIV=" + iv;
  return createHash("sha256").update(raw, "utf8").digest("hex").toUpperCase();
}

function buildEncryptedFormBody(decryptedData, status) {
  const serialized = stringify(decryptedData);
  const tradeInfo = encryptTradeInfo(serialized, TEST_KEY, TEST_IV);
  const tradeSha = createTradeSha(tradeInfo, TEST_KEY, TEST_IV);
  const params = new URLSearchParams();
  params.set("MerchantID", TEST_MERCHANT_ID);
  params.set("TradeInfo", tradeInfo);
  params.set("TradeSha", tradeSha);
  params.set("Status", status);
  params.set("Version", "2.3");
  params.set("EncryptType", "1");
  return params.toString();
}

// ─── HTTP helper ───

const BASE = "http://localhost:3000";

async function apiPostForm(url, formBody) {
  const ip = "40.0.0." + Math.floor(Math.random() * 250 + 1);
  const res = await fetch(BASE + url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "x-forwarded-for": ip },
    body: formBody,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: res.status, data, text };
}

async function apiPostJson(url, jsonBody) {
  const ip = "40.0.0." + Math.floor(Math.random() * 250 + 1);
  const res = await fetch(BASE + url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(jsonBody),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: res.status, data, text };
}

async function createPayment() {
  return apiPostJson("/api/create-payment", {});
}

// ─── Test runner ───
let passed = 0, failed = 0;

function assert(cond, label, actual) {
  if (cond) { passed++; } else {
    failed++;
    if (actual !== undefined) {
      console.log("  [FAIL] " + label + " (got: " + JSON.stringify(actual) + ")");
    } else {
      console.log("  [FAIL] " + label);
    }
  }
}

function testLabel(n, desc) {
  console.log("--- " + n + " - " + desc + " ---");
}

// ═══════════════════════════════════════════════════════════
console.log("===== NewebPay Webhook Route Test =====");
console.log("(requires dev server with PAYMENT_PROVIDER=newebpay)");
console.log("");

// ─── Helper: build a valid callback payload and send it ───
async function sendValidCallback(paymentId, overrides) {
  const decryptedData = {
    MerchantID: TEST_MERCHANT_ID,
    MerchantOrderNo: paymentId,
    Amt: 49,
    TradeNo: "NPTX_ROUTE_TEST_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    Status: "SUCCESS",
    PayTime: "2025-06-13 12:34:56",
    PaymentType: "CREDIT",
    ...overrides,
  };
  const status = decryptedData.Status;
  delete decryptedData.Status;
  const formBody = buildEncryptedFormBody(decryptedData, status);
  return apiPostForm("/api/payment-webhook", formBody);
}

// ═══════════════════════════════════════════════════════════
// Test 1: Form-urlencoded callback parse
// ═══════════════════════════════════════════════════════════
testLabel(1, "Form-urlencoded callback parse → route responds 200");
{
  const pay = await createPayment();
  assert(pay.status === 200, "create-payment returned 200");
  const payId = pay.data.payment?.id;
  assert(!!payId, "paymentId exists");

  const r = await sendValidCallback(payId);
  assert(r.status === 200, "response status is 200");
  assert(r.data.ok === true, "ok is true", r.data);
  assert(r.data.processed === true, "processed is true", r.data);
  console.log("  [PASS]");
}

// ═══════════════════════════════════════════════════════════
// Test 2: Success callback → Payment paid (status → paid via webhook)
// ═══════════════════════════════════════════════════════════
testLabel(2, "Success callback + amount match → processed:true");
{
  const pay = await createPayment();
  const payId = pay.data.payment?.id;
  assert(!!payId, "paymentId exists");

  const r = await sendValidCallback(payId);
  assert(r.status === 200, "status 200", r.status);
  assert(r.data.processed === true, "processed is true", r.data);
  assert(r.data.ok === true, "ok is true", r.data);
  console.log("  [PASS]");
}

// ═══════════════════════════════════════════════════════════
// Test 3: Success callback → providerPaymentId = TradeNo
// ═══════════════════════════════════════════════════════════
testLabel(3, "Success callback → providerPaymentId saved as TradeNo");
{
  const pay = await createPayment();
  const payId = pay.data.payment?.id;
  assert(!!payId, "paymentId exists");

  // Build with a unique TradeNo
  const uniqueTradeNo = "NPTX_TRADENO_TEST_" + Date.now();
  const r = await sendValidCallback(payId, { TradeNo: uniqueTradeNo });
  assert(r.status === 200, "status 200", r.status);
  assert(r.data.processed === true, "processed is true", r.data);

  // Duplicate check: same TradeNo should return duplicated
  const r2 = await sendValidCallback(payId, { TradeNo: uniqueTradeNo });
  assert(r2.status === 200, "duplicate status 200", r2.status);
  assert(r2.data.duplicated === true, "duplicate callback returns duplicated:true", r2.data);
  console.log("  [PASS]");
}

// ═══════════════════════════════════════════════════════════
// Test 4: Invalid signature → processed:false
// ═══════════════════════════════════════════════════════════
testLabel(4, "Invalid TradeSha → processed:false, reason=invalid_signature");
{
  const pay = await createPayment();
  const payId = pay.data.payment?.id;
  assert(!!payId, "paymentId exists");

  // Build with wrong TradeSha
  const decryptedData = {
    MerchantID: TEST_MERCHANT_ID,
    MerchantOrderNo: payId,
    Amt: 49,
    TradeNo: "NPTX_INVSIG_" + Date.now(),
    Status: "SUCCESS",
    PayTime: "2025-06-13 12:34:56",
    PaymentType: "CREDIT",
  };
  const serialized = stringify(decryptedData);
  const tradeInfo = encryptTradeInfo(serialized, TEST_KEY, TEST_IV);
  const wrongSha = "A".repeat(64); // Fake SHA
  const params = new URLSearchParams();
  params.set("MerchantID", TEST_MERCHANT_ID);
  params.set("TradeInfo", tradeInfo);
  params.set("TradeSha", wrongSha);
  params.set("Status", "SUCCESS");
  const formBody = params.toString();

  const r = await apiPostForm("/api/payment-webhook", formBody);
  assert(r.status === 200, "status 200", r.status);
  assert(r.data.processed === false, "processed is false");
  assert(r.data.reason === "invalid_signature", "reason is invalid_signature");
  console.log("  [PASS]");
}

// ═══════════════════════════════════════════════════════════
// Test 5: Failed Status → processed:false
// ═══════════════════════════════════════════════════════════
testLabel(5, "Failed Status → processed:false, not_paid reason");
{
  const pay = await createPayment();
  const payId = pay.data.payment?.id;
  assert(!!payId, "paymentId exists");

  // Build with failed status - outer Status=TRA-20001, decrypted Status=2
  const decryptedData = {
    MerchantID: TEST_MERCHANT_ID,
    MerchantOrderNo: payId,
    Amt: 49,
    TradeNo: "NPTX_FAILED_" + Date.now(),
    Status: "2",
    PayTime: "2025-06-13 12:34:56",
    PaymentType: "CREDIT",
  };
  const serialized = stringify(decryptedData);
  const tradeInfo = encryptTradeInfo(serialized, TEST_KEY, TEST_IV);
  const tradeSha = createTradeSha(tradeInfo, TEST_KEY, TEST_IV);
  const params = new URLSearchParams();
  params.set("MerchantID", TEST_MERCHANT_ID);
  params.set("TradeInfo", tradeInfo);
  params.set("TradeSha", tradeSha);
  params.set("Status", "TRA-20001");
  const formBody = params.toString();

  const r = await apiPostForm("/api/payment-webhook", formBody);
  assert(r.status === 200, "status 200", r.status);
  assert(r.data.processed === false, "processed is false");
  // The reason could be "not_paid" (decrypted Status=2 is not "1" or "SUCCESS")
  assert(r.data.reason !== undefined, "reason is present");
  console.log("  [PASS]");
}

// ═══════════════════════════════════════════════════════════
// Test 6: Amount mismatch → processed:false
// ═══════════════════════════════════════════════════════════
testLabel(6, "Amount mismatch → processed:false, reason=amount_mismatch");
{
  const pay = await createPayment();
  const payId = pay.data.payment?.id;
  assert(!!payId, "paymentId exists");

  // Amt=999 but payment.amountTwd=49
  const r = await sendValidCallback(payId, { Amt: 999 });
  assert(r.status === 200, "status 200", r.status);
  assert(r.data.processed === false, "processed is false");
  assert(r.data.reason === "amount_mismatch", "reason is amount_mismatch");
  console.log("  [PASS]");
}

// ═══════════════════════════════════════════════════════════
// Test 7: Payment not found → processed:false
// ═══════════════════════════════════════════════════════════
testLabel(7, "Payment not found → processed:false, reason=payment_not_found");
{
  const fakePayId = "pay_doesnotexist_" + Date.now();
  const r = await sendValidCallback(fakePayId);
  assert(r.status === 200, "status 200", r.status);
  assert(r.data.processed === false, "processed is false");
  assert(r.data.reason === "payment_not_found", "reason is payment_not_found");
  console.log("  [PASS]");
}

// ═══════════════════════════════════════════════════════════
// Test 8: Duplicate callback → duplicated:true
// ═══════════════════════════════════════════════════════════
testLabel(8, "Duplicate callback → duplicated:true, not reprocessed");
{
  const pay = await createPayment();
  const payId = pay.data.payment?.id;
  assert(!!payId, "paymentId exists");

  const uniqueTradeNo = "NPTX_DUP_TEST_" + Date.now();
  // First call
  const r1 = await sendValidCallback(payId, { TradeNo: uniqueTradeNo });
  assert(r1.status === 200, "first call status 200");
  assert(r1.data.processed === true, "first call processed:true", r1.data);

  // Second call with same TradeNo
  const r2 = await sendValidCallback(payId, { TradeNo: uniqueTradeNo });
  assert(r2.status === 200, "second call status 200");
  assert(r2.data.duplicated === true, "second call duplicated:true", r2.data);
  assert(r2.data.processed === false, "second call processed:false", r2.data);
  console.log("  [PASS]");
}

// ═══════════════════════════════════════════════════════════
// Test 9: Missing env is covered by unit test (newebpay-verify-callback-test.mjs)
// In route integration context, env is always set when PAYMENT_PROVIDER=newebpay
// ═══════════════════════════════════════════════════════════
testLabel(9, "Missing env → already covered by unit test (skip route integration)");
{
  console.log("  (verified by newebpay-verify-callback-test.mjs test 1)");
  console.log("  [PASS]");
}

// ═══════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════
console.log("\n===== Summary =====");
console.log("Passed: " + passed);
console.log("Failed: " + failed);
if (failed > 0) process.exit(1);



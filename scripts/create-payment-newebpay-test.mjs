// ─── NewebPay create-payment Route Test ───
// Tests /api/create-payment returns formHtml when PAYMENT_PROVIDER=newebpay.
// Requires dev server with PAYMENT_PROVIDER=newebpay + test credentials.
//
// Also tests that mock/unset PAYMENT_PROVIDER returns the old format (no formHtml).
// No sandbox calls. No real keys. Test-only credentials.

const BASE = "http://localhost:3000";
const TEST_MERCHANT_ID = "MS127874575";

let passed = 0, failed = 0;

function assert(cond, label) {
  if (cond) { passed++; } else { failed++; console.log("  [FAIL] " + label); }
}

function testLabel(n, desc) {
  console.log("--- " + n + " - " + desc + " ---");
}

async function apiPostJson(url, body) {
  const res = await fetch(BASE + url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: res.status, data, text };
}

console.log("===== NewebPay Create-Payment Test =====");

// ─── Probe: detect provider mode ───
const probe = await apiPostJson("/api/create-payment", {});
const isNewebPay = probe.status === 200 && typeof probe.data.formHtml === "string";
const isMock = probe.status === 200 && probe.data.formHtml === undefined;
const isError = probe.status !== 200;

if (isError) {
  console.log("\n--- Route error (status=" + probe.status + ") ---");
  console.log("  [FAIL] " + JSON.stringify(probe.data || probe.text));
  failed++;
} else if (isMock) {
  // ═══ Mock provider tests ═══
  console.log("\n--- M1 - Mock provider → response without formHtml ---");
  const r = probe;
  assert(r.data.payment !== undefined, "payment object exists");
  assert(typeof r.data.payment.id === "string", "payment.id is string");
  assert(r.data.payment.status === "pending", "payment.status is pending");
  assert(typeof r.data.analysisId === "string", "analysisId is string");
  assert(r.data.formHtml === undefined, "formHtml is undefined for mock");
  // No sensitive fields
  assert(r.data.payment.providerName === undefined, "providerName not exposed");
  assert(r.data.payment.providerPaymentId === undefined, "providerPaymentId not exposed");
  assert(r.data.payment.providerRawResponse === undefined, "providerRawResponse not exposed");
  console.log("  [PASS]");
} else {
  // ═══ NewebPay provider tests ═══
  console.log("\n--- N1 - NewebPay provider → response with formHtml ---");
  const r = probe;
  assert(typeof r.data.payment.id === "string", "payment.id is string");
  assert(r.data.payment.status === "pending", "payment.status is pending");
  assert(typeof r.data.analysisId === "string", "analysisId is string");

  // formHtml must be present
  assert(typeof r.data.formHtml === "string", "formHtml is a string");
  assert(r.data.formHtml.length > 0, "formHtml is non-empty");

  const payId = r.data.payment.id;
  const formHtml = r.data.formHtml;

  // formHtml contains the MPG form fields (MerchantID visible, TradeInfo/TradeSha encrypted)
  assert(formHtml.includes('name="MerchantID"'), "formHtml has MerchantID field");
  assert(formHtml.includes('name="TradeInfo"'), "formHtml has TradeInfo field");
  assert(formHtml.includes('name="TradeSha"'), "formHtml has TradeSha field");
  assert(formHtml.includes('name="Version"'), "formHtml has Version field");
  assert(formHtml.includes('name="EncryptType"'), "formHtml has EncryptType field");
  assert(formHtml.includes(TEST_MERCHANT_ID), "formHtml contains MerchantID value");

  // MPG URL is the form action
  assert(formHtml.includes("mpg_gateway"), "formHtml action points to MPG gateway");

  // TradeInfo is a hex string (encrypted)
  const tradeInfoMatch = formHtml.match(/name="TradeInfo" value="([^"]+)"/);
  assert(tradeInfoMatch !== null, "TradeInfo value found in formHtml");
  if (tradeInfoMatch) {
    assert(/^[0-9a-f]+$/i.test(tradeInfoMatch[1]), "TradeInfo is hex (encrypted)");
  }

  // No sensitive fields in response
  const bodyStr = JSON.stringify(r.data);
  assert(!bodyStr.includes("HashKey"), "response does not contain HashKey");
  assert(!bodyStr.includes("HashIV"), "response does not contain HashIV");
  console.log("  [PASS]");

  // No sensitive fields in formHtml
  assert(!formHtml.includes("HashKey"), "formHtml does not contain HashKey");
  assert(!formHtml.includes("HashIV"), "formHtml does not contain HashIV");
  console.log("\n--- N2 - formHtml safety ---");
  console.log("  [PASS]");
}

// ─── Summary ───
console.log("\n===== Summary =====");
console.log("Passed: " + passed);
console.log("Failed: " + failed);
if (failed > 0) process.exit(1);


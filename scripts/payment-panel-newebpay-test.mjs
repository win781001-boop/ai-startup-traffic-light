// ─── PaymentPanel formHtml Handoff Test (Phase 3P-C) ───
// Tests two scenarios depending on PAYMENT_PROVIDER:
//   mock:     create-payment returns no formHtml, confirm-payment works
//   newebpay: create-payment returns formHtml, confirm-payment 404
//
// Designed to be called by test-payment-panel-newebpay.ps1.
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
    body: JSON.stringify(body || {}),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = null; }
  return { status: res.status, data, text };
}

console.log("===== PaymentPanel formHtml Handoff Test (Phase 3P-C) =====");

// ─── Probe: detect provider mode ───
const probe = await apiPostJson("/api/create-payment", {});
const isNewebPay = probe.status === 200 && typeof probe.data?.formHtml === "string";
const isMock = probe.status === 200 && probe.data?.formHtml === undefined;

if (probe.status !== 200) {
  console.log("\n--- Route error (status=" + probe.status + ") ---");
  console.log("  [FAIL] " + JSON.stringify(probe.data || probe.text));
  failed++;
} else if (isMock) {
  // ══════════════════════════════════════════
  // Mock provider tests
  // ══════════════════════════════════════════

  testLabel("M1", "Mock create-payment: no formHtml, safe fields");
  const m1 = probe;
  assert(typeof m1.data.payment.id === "string", "payment.id is string");
  assert(m1.data.payment.status === "pending", "payment.status is pending");
  assert(typeof m1.data.analysisId === "string", "analysisId is string");
  assert(m1.data.formHtml === undefined, "formHtml is undefined for mock");
  // No sensitive fields exposed
  assert(m1.data.payment.providerName === undefined, "providerName not exposed");
  assert(m1.data.payment.providerPaymentId === undefined, "providerPaymentId not exposed");
  assert(m1.data.payment.providerRawResponse === undefined, "providerRawResponse not exposed");
  console.log("  [PASS]");

  testLabel("M2", "Mock confirm-payment succeeds");
  const m2 = await apiPostJson("/api/confirm-payment", { paymentId: m1.data.payment.id });
  assert(m2.status === 200, "confirm-payment returns 200");
  console.log("  [PASS]");

  testLabel("M3", "Mock confirm-payment changes status to paid");
  assert(m2.data?.payment?.status === "paid", "payment.status is paid after confirm");
  console.log("  [PASS]");
} else if (isNewebPay) {
  // ══════════════════════════════════════════
  // NewebPay provider tests
  // ══════════════════════════════════════════

  testLabel("N1", "NewebPay create-payment: response with formHtml");
  const n1 = probe;
  assert(typeof n1.data.payment.id === "string", "payment.id is string");
  assert(n1.data.payment.status === "pending", "payment.status is pending");
  assert(typeof n1.data.analysisId === "string", "analysisId is string");
  assert(typeof n1.data.formHtml === "string", "formHtml is a string");
  assert(n1.data.formHtml.length > 0, "formHtml is non-empty");
  console.log("  [PASS]");

  const formHtml = n1.data.formHtml;

  testLabel("N2", "FormHtml contains MPG form fields");
  assert(formHtml.includes('name="MerchantID"'), "formHtml has MerchantID field");
  assert(formHtml.includes('name="TradeInfo"'), "formHtml has TradeInfo field");
  assert(formHtml.includes('name="TradeSha"'), "formHtml has TradeSha field");
  assert(formHtml.includes('name="Version"'), "formHtml has Version field");
  assert(formHtml.includes('name="EncryptType"'), "formHtml has EncryptType field");
  assert(formHtml.includes(TEST_MERCHANT_ID), "formHtml contains MerchantID value");
  assert(formHtml.includes("mpg_gateway"), "formHtml action points to MPG gateway");
  console.log("  [PASS]");

  testLabel("N3", "TradeInfo is encrypted (hex string)");
  const tradeInfoMatch = formHtml.match(/name="TradeInfo" value="([^"]+)"/);
  assert(tradeInfoMatch !== null, "TradeInfo value found in formHtml");
  if (tradeInfoMatch) {
    assert(/^[0-9a-f]+$/i.test(tradeInfoMatch[1]), "TradeInfo is hex (encrypted)");
  }
  console.log("  [PASS]");

  testLabel("N4", "Response does not contain HashKey / HashIV");
  const bodyStr = JSON.stringify(n1.data);
  assert(!bodyStr.includes("HashKey"), "response does not contain HashKey");
  assert(!bodyStr.includes("HashIV"), "response does not contain HashIV");
  console.log("  [PASS]");

  testLabel("N5", "FormHtml does not contain HashKey / HashIV");
  assert(!formHtml.includes("HashKey"), "formHtml does not contain HashKey");
  assert(!formHtml.includes("HashIV"), "formHtml does not contain HashIV");
  console.log("  [PASS]");

  testLabel("N6", "confirm-payment returns 404 (provider guard)");
  const n6 = await apiPostJson("/api/confirm-payment", { paymentId: n1.data.payment.id });
  assert(n6.status === 404, "confirm-payment returns 404 for newebpay provider");
  console.log("  [PASS]");

  testLabel("N7", "FormHtml contains <form> for auto-submit");
  assert(formHtml.includes("<form") || formHtml.includes("<FORM"), "formHtml has <form> element");
  assert(formHtml.includes('action=') || formHtml.includes('ACTION='), "formHtml has action attribute");
  assert(formHtml.includes('type="submit"') || formHtml.includes('TYPE="submit"'), "formHtml has submit button");
  console.log("  [PASS]");
} else {
  console.log("\n--- Unknown provider mode ---");
  console.log("  [FAIL] status=" + probe.status + " body=" + (probe.text || "(empty)"));
  failed++;
}

// ─── Summary ───
console.log("\n===== Summary =====");
console.log("Passed: " + passed);
console.log("Failed: " + failed);
if (failed > 0) process.exit(1);

// ─── Payment Status API Test ───
// Tests GET /api/payment-status read-only behavior.
// Requires a running dev server on http://localhost:3000.

const BASE = "http://localhost:3000";

let passed = 0, failed = 0;

function assert(cond, label) {
  if (cond) { passed++; } else { failed++; console.log("  [FAIL] " + label); }
}

function testLabel(n, desc) {
  console.log("--- " + n + " - " + desc + " ---");
}

async function apiGet(url) {
  const res = await fetch(BASE + url);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: res.status, data };
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
  return { status: res.status, data };
}

console.log("===== Payment Status API Test =====");
console.log("");

// ═══════════════════════════════════════════════════════════
// Test 1: Missing paymentId → 400
// ═══════════════════════════════════════════════════════════
testLabel(1, "Missing paymentId → 400");
{
  const r = await apiGet("/api/payment-status");
  assert(r.status === 400, "status 400");
  assert(typeof r.data.error === "string", "error message present");
  console.log("  [PASS]");
}

// ═══════════════════════════════════════════════════════════
// Test 2: Payment not found → 404
// ═══════════════════════════════════════════════════════════
testLabel(2, "Payment not found → 404");
{
  const r = await apiGet("/api/payment-status?paymentId=pay_nonexistent");
  assert(r.status === 404, "status 404");
  assert(typeof r.data.error === "string", "error message present");
  console.log("  [PASS]");
}

// ═══════════════════════════════════════════════════════════
// Test 3: Pending payment → returns pending status + safe fields
// ═══════════════════════════════════════════════════════════
testLabel(3, "Pending payment → returns pending + safe fields");
{
  const pay = await apiPostJson("/api/create-payment", {});
  assert(pay.status === 200, "create-payment returned 200");
  const payId = pay.data.payment?.id;
  assert(!!payId, "paymentId exists");

  const r = await apiGet("/api/payment-status?paymentId=" + encodeURIComponent(payId));
  assert(r.status === 200, "status 200");
  assert(r.data.paymentId === payId, "paymentId matches");
  assert(r.data.status === "pending", "status is pending");
  assert(typeof r.data.amountTwd === "number", "amountTwd is a number");
  assert(typeof r.data.analysisId === "string" || r.data.analysisId === null, "analysisId is string or null");
  // Must not include sensitive fields
  const bodyStr = JSON.stringify(r.data);
  assert(!bodyStr.includes("providerRawResponse"), "no providerRawResponse");
  console.log("  [PASS]");
}

// ═══════════════════════════════════════════════════════════
// Test 4: Paid payment → returns paid status
// ═══════════════════════════════════════════════════════════
testLabel(4, "Paid payment → returns paid + paidAt");
{
  const pay = await apiPostJson("/api/create-payment", {});
  assert(pay.status === 200, "create-payment returned 200");
  const payId = pay.data.payment?.id;
  assert(!!payId, "paymentId exists");

  // Confirm via mock confirm-payment
  const confirm = await apiPostJson("/api/confirm-payment", { paymentId: payId });
  assert(confirm.status === 200, "confirm-payment returned 200");

  const r = await apiGet("/api/payment-status?paymentId=" + encodeURIComponent(payId));
  assert(r.status === 200, "status 200");
  assert(r.data.status === "paid", "status is paid");
  assert(typeof r.data.paidAt === "string", "paidAt is a string (ISO date)");
  console.log("  [PASS]");
}

// ═══════════════════════════════════════════════════════════
// Test 5: API does NOT update payment status (read-only check)
// ═══════════════════════════════════════════════════════════
testLabel(5, "Payment status API is read-only (calling it does not change status)");
{
  const pay = await apiPostJson("/api/create-payment", {});
  assert(pay.status === 200, "create-payment returned 200");
  const payId = pay.data.payment?.id;
  assert(!!payId, "paymentId exists");

  // Call payment-status multiple times
  for (let i = 0; i < 3; i++) {
    const r = await apiGet("/api/payment-status?paymentId=" + encodeURIComponent(payId));
    assert(r.status === 200, "status 200 on call " + (i + 1));
    assert(r.data.status === "pending", "status remains pending after call " + (i + 1));
  }
  console.log("  [PASS]");
}

// ═══════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════
console.log("\n===== Summary =====");
console.log("Passed: " + passed);
console.log("Failed: " + failed);
if (failed > 0) process.exit(1);

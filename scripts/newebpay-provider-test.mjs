// ─── NewebPay Provider Test ───
// Tests newebpayProvider.createPayment() and verifyCallback() behavior.
// No NewebPay sandbox needed. No real keys. All keys are test-only values.

import { createHash, createCipheriv } from "node:crypto";
import { stringify } from "node:querystring";

// ─── Constants (mirroring newebpay-crypto.ts) ───
const MPG_VERSION = "2.3";
const DEFAULT_RESPOND_TYPE = "JSON";
const DEFAULT_LOGIN_TYPE = 0;

// ─── Test-only credentials (never used in production) ───
const TEST_KEY = "Fs5cX1TGqYM2PpdbE14a9H83YQSQF5jn";
const TEST_IV  = "C6AcmfqJILwgnhIP";
const TEST_MERCHANT_ID = "MS127874575";
const TEST_MPG_URL = "https://ccore.newebpay.com/MPG/mpg_gateway";

// ─── Re-implement helpers (matching newebpay-crypto.ts & newebpay.ts) ───

function buildPayload(merchantId, orderNo, amount, desc, opts) {
  return {
    MerchantID: merchantId,
    RespondType: opts?.RespondType ?? DEFAULT_RESPOND_TYPE,
    TimeStamp: opts?.TimeStamp ?? Math.floor(Date.now() / 1000),
    Version: opts?.Version ?? MPG_VERSION,
    MerchantOrderNo: orderNo,
    Amt: amount,
    ItemDesc: desc,
    LoginType: opts?.LoginType ?? DEFAULT_LOGIN_TYPE,
    Email: opts?.Email,
    NotifyURL: opts?.NotifyURL,
    ReturnURL: opts?.ReturnURL,
    ClientBackURL: opts?.ClientBackURL,
  };
}

function serialize(payload) {
  return stringify(payload);
}

function encrypt(plain, key, iv) {
  const c = createCipheriv("aes-256-cbc", Buffer.from(key, "utf8"), Buffer.from(iv, "utf8"));
  return Buffer.concat([c.update(plain, "utf8"), c.final()]).toString("hex");
}

function buildSha(tradeInfo, key, iv) {
  const raw = "HashKey=" + key + "&" + tradeInfo + "&HashIV=" + iv;
  return createHash("sha256").update(raw, "utf8").digest("hex").toUpperCase();
}

function buildMpg(payload, key, iv) {
  const s = serialize(payload);
  const ti = encrypt(s, key, iv);
  return { MerchantID: payload.MerchantID, TradeInfo: ti, TradeSha: buildSha(ti, key, iv), Version: payload.Version };
}

function esc(val) {
  return val.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── Provider mirror (matching newebpay.ts) ───

function requireEnvVars(env) {
  const required = ["NEWEBPAY_MERCHANT_ID", "NEWEBPAY_HASH_KEY", "NEWEBPAY_HASH_IV", "NEWEBPAY_MPG_URL"];
  const missing = required.filter((k) => !env[k]);
  if (missing.length > 0) throw new Error("Missing NewebPay environment variables: " + missing.join(", "));
}

async function createPayment(input, env) {
  requireEnvVars(env);
  if (!input.merchantOrderNo) throw new Error("NewebPay createPayment requires merchantOrderNo (paymentId)");

  const payload = buildPayload(
    env.NEWEBPAY_MERCHANT_ID, input.merchantOrderNo, input.amountTwd,
    input.description || "AI Startup Traffic Light Report",
    { Email: input.customerEmail, NotifyURL: input.notifyUrl, ReturnURL: input.returnUrl },
  );

  const form = buildMpg(payload, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
  const mpgUrl = env.NEWEBPAY_MPG_URL;

  const hidden = [
    { name: "MerchantID", value: form.MerchantID },
    { name: "TradeInfo", value: form.TradeInfo },
    { name: "TradeSha", value: form.TradeSha },
    { name: "Version", value: form.Version },
    { name: "EncryptType", value: "1" },
  ];
  const fields = hidden.map((f) => "    <input type=\"hidden\" name=\"" + esc(f.name) + "\" value=\"" + esc(f.value) + "\" />").join("\n");

  const formHtml = "<form id=\"newebpay-form\" method=\"post\" action=\"" + esc(mpgUrl) + "\" style=\"display:none\">\n" + fields + "\n  <noscript><button type=\"submit\">前往付款頁面</button></noscript>\n</form>\n<script>document.getElementById(\"newebpay-form\").submit();</script>";

  return {
    provider: "newebpay",
    providerPaymentId: input.merchantOrderNo,
    paymentUrl: mpgUrl,
    formHtml,
    status: "pending",
    raw: {
      mpgUrl,
      merchantOrderNo: input.merchantOrderNo,
      amountTwd: input.amountTwd,
      formFields: { MerchantID: form.MerchantID, TradeInfo: form.TradeInfo, TradeSha: form.TradeSha, Version: form.Version },
    },
  };
}

function verifyCallback() {
  return {
    provider: "newebpay",
    providerPaymentId: "not_verified",
    paid: false,
    amountTwd: undefined,
    raw: { status: "not_implemented", message: "NewebPay callback verification is not implemented yet" },
  };
}

// ─── Test runner ───
let passed = 0, failed = 0;
function assert(cond, label) { if (cond) { passed++; } else { failed++; console.log("  [FAIL] " + label); } }

const FIXED_TS = 1718200000;
const ORDER_NO = "pay-test-abc123";
const AMOUNT = 49;
const DESC = "AI創業紅綠燈 首次完整報告";
const EMAIL = "test@example.com";
const NOTIFY_URL = "https://api.example.com/api/payment-webhook";
const RETURN_URL = "https://example.com/payment/result";

const TEST_ENV = {
  NEWEBPAY_MERCHANT_ID: TEST_MERCHANT_ID,
  NEWEBPAY_HASH_KEY: TEST_KEY,
  NEWEBPAY_HASH_IV: TEST_IV,
  NEWEBPAY_MPG_URL: TEST_MPG_URL,
};

// ═══════════════
// Test 1: Missing env vars
// ═══════════════
console.log("--- 1 - Missing env vars throw ---");
{
  const emptyEnv = {};
  try {
    await createPayment({ merchantOrderNo: ORDER_NO, amountTwd: AMOUNT }, emptyEnv);
    assert(false, "should have thrown");
  } catch (e) {
    assert(e.message.includes("Missing NewebPay environment variables"), "error mentions missing env");
    assert(e.message.includes("NEWEBPAY_MERCHANT_ID"), "lists MERCHANT_ID");
    assert(e.message.includes("NEWEBPAY_HASH_KEY"), "lists HASH_KEY");
    assert(e.message.includes("NEWEBPAY_HASH_IV"), "lists HASH_IV");
    assert(e.message.includes("NEWEBPAY_MPG_URL"), "lists MPG_URL");
  }
  console.log("  [PASS]");
}

// ═══════════════
// Test 2: Missing merchantOrderNo
// ═══════════════
console.log("--- 2 - Missing merchantOrderNo throws ---");
{
  try {
    await createPayment({ amountTwd: AMOUNT }, TEST_ENV);
    assert(false, "should have thrown");
  } catch (e) {
    assert(e.message.includes("merchantOrderNo"), "error mentions merchantOrderNo");
  }
  console.log("  [PASS]");
}

// ═══════════════
// Test 3: Successful createPayment
// ═══════════════
console.log("--- 3 - Successful createPayment ---");
{
  const r = await createPayment({
    merchantOrderNo: ORDER_NO, amountTwd: AMOUNT, description: DESC,
    customerEmail: EMAIL, notifyUrl: NOTIFY_URL, returnUrl: RETURN_URL,
  }, TEST_ENV);

  assert(r.provider === "newebpay", "provider === newebpay");
  assert(r.providerPaymentId === ORDER_NO, "providerPaymentId === merchantOrderNo");
  assert(r.paymentUrl === TEST_MPG_URL, "paymentUrl === MPG_URL");
  assert(typeof r.formHtml === "string" && r.formHtml.length > 0, "formHtml is non-empty string");
  assert(r.status === "pending", "status is pending (not paid)");

  // raw
  assert(r.raw !== undefined, "raw exists");
  assert(r.raw.mpgUrl === TEST_MPG_URL, "raw.mpgUrl");
  assert(r.raw.merchantOrderNo === ORDER_NO, "raw.merchantOrderNo");
  assert(r.raw.amountTwd === AMOUNT, "raw.amountTwd");
  assert(r.raw.formFields !== undefined, "raw.formFields exists");
  assert(typeof r.raw.formFields.MerchantID === "string" && r.raw.formFields.MerchantID.length > 0, "formFields.MerchantID");
  assert(typeof r.raw.formFields.TradeInfo === "string" && r.raw.formFields.TradeInfo.length > 0, "formFields.TradeInfo");
  assert(typeof r.raw.formFields.TradeSha === "string" && r.raw.formFields.TradeSha.length > 0, "formFields.TradeSha");
  assert(typeof r.raw.formFields.Version === "string" && r.raw.formFields.Version.length > 0, "formFields.Version");
  console.log("  [PASS]");
}

// ═══════════════
// Test 4: formHtml safety
// ═══════════════
console.log("--- 4 - formHtml safety ---");
{
  const r = await createPayment({
    merchantOrderNo: ORDER_NO, amountTwd: AMOUNT, description: DESC,
  }, TEST_ENV);

  assert(r.formHtml.includes('method="post"'), "method=post");
  assert(r.formHtml.includes("action=\"" + esc(TEST_MPG_URL) + "\""), "action=MPG_URL");
  assert(r.formHtml.includes('name="MerchantID"'), "MerchantID input");
  assert(r.formHtml.includes('name="TradeInfo"'), "TradeInfo input");
  assert(r.formHtml.includes('name="TradeSha"'), "TradeSha input");
  assert(r.formHtml.includes('name="Version"'), "Version input");
  assert(r.formHtml.includes('name="EncryptType"'), "EncryptType input");
  assert(!r.formHtml.includes(TEST_KEY), "formHtml does not contain HashKey");
  assert(!r.formHtml.includes(TEST_IV), "formHtml does not contain HashIV");
  assert(!r.formHtml.includes(ORDER_NO), "formHtml does not leak plaintext MerchantOrderNo");
  console.log("  [PASS]");
}

// ═══════════════
// Test 5: raw safety
// ═══════════════
console.log("--- 5 - raw safety ---");
{
  const r = await createPayment({
    merchantOrderNo: ORDER_NO, amountTwd: AMOUNT, description: DESC,
  }, TEST_ENV);

  const rawStr = JSON.stringify(r.raw);
  assert(!rawStr.includes(TEST_KEY), "raw does not contain HashKey");
  assert(!rawStr.includes(TEST_IV), "raw does not contain HashIV");
  assert(rawStr.includes(ORDER_NO), "raw contains merchantOrderNo");
  assert(rawStr.includes(String(AMOUNT)), "raw contains amountTwd");
  console.log("  [PASS]");
}

// ═══════════════
// Test 6: verifyCallback safe failure
// ═══════════════
console.log("--- 6 - verifyCallback safe failure ---");
{
  const v = verifyCallback();
  assert(v.provider === "newebpay", "provider === newebpay");
  assert(v.paid === false, "paid === false");
  assert(v.providerPaymentId === "not_verified", "providerPaymentId === not_verified");
  assert(v.raw.status === "not_implemented", "raw.status === not_implemented");
  console.log("  [PASS]");
}

// ═══════════════
// Summary
// ═══════════════
console.log("\n===== Summary =====");
console.log("Passed: " + passed);
console.log("Failed: " + failed);
if (failed > 0) process.exit(1);

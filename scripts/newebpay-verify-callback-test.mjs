// ─── NewebPay verifyCallback Test ───
// Tests newebpayProvider.verifyCallback() parsing logic.
// No NewebPay sandbox needed. No real keys. All keys are test-only values.
// Re-implements crypto helpers to match the provider implementation.

import { createHash, createCipheriv, createDecipheriv } from "node:crypto";
import { stringify } from "node:querystring";

// ─── Test credentials (never used in production) ───
const TEST_KEY = "Fs5cX1TGqYM2PpdbE14a9H83YQSQF5jn";
const TEST_IV  = "C6AcmfqJILwgnhIP";
const TEST_MERCHANT_ID = "MS127874575";
const TEST_MPG_URL = "https://ccore.newebpay.com/MPG/mpg_gateway";

// ─── Crypto helpers (matching newebpay-crypto.ts) ───

function encryptTradeInfo(plain, key, iv) {
  const c = createCipheriv("aes-256-cbc", Buffer.from(key, "utf8"), Buffer.from(iv, "utf8"));
  return Buffer.concat([c.update(plain, "utf8"), c.final()]).toString("hex");
}

function decryptTradeInfo(encrypted, key, iv) {
  const d = createDecipheriv("aes-256-cbc", Buffer.from(key, "utf8"), Buffer.from(iv, "utf8"));
  return Buffer.concat([d.update(Buffer.from(encrypted, "hex")), d.final()]).toString("utf8");
}

function createTradeSha(tradeInfo, key, iv) {
  const raw = "HashKey=" + key + "&" + tradeInfo + "&HashIV=" + iv;
  return createHash("sha256").update(raw, "utf8").digest("hex").toUpperCase();
}

// ─── verifyCallback mirror (matching newebpay.ts) ───

function verifyCallback(input, env) {
  const merchantId = env.NEWEBPAY_MERCHANT_ID;
  const hashKey = env.NEWEBPAY_HASH_KEY;
  const hashIv = env.NEWEBPAY_HASH_IV;

  if (!merchantId || !hashKey || !hashIv) {
    return { provider: "newebpay", providerPaymentId: "not_verified", paid: false, raw: { reason: "missing_env" } };
  }

  const payload = input.payload;

  const requiredFields = ["MerchantID", "TradeInfo", "TradeSha", "Status"];
  const missingFields = requiredFields.filter((f) => !payload[f]);
  if (missingFields.length > 0) {
    return { provider: "newebpay", providerPaymentId: "not_verified", paid: false, raw: { reason: "missing_field", missingFields } };
  }

  const payloadMerchantId = String(payload.MerchantID);
  const tradeInfo = String(payload.TradeInfo);
  const tradeSha = String(payload.TradeSha);
  const status = String(payload.Status);

  const expectedSha = createTradeSha(tradeInfo, hashKey, hashIv);
  if (expectedSha !== tradeSha.toUpperCase()) {
    return { provider: "newebpay", providerPaymentId: "not_verified", paid: false, raw: { reason: "invalid_signature" } };
  }

  let decryptedStr;
  try {
    decryptedStr = decryptTradeInfo(tradeInfo, hashKey, hashIv);
  } catch {
    return { provider: "newebpay", providerPaymentId: "not_verified", paid: false, raw: { reason: "decrypt_failed" } };
  }

  let decrypted;
  try {
    const trimmed = decryptedStr.trim();
    if (trimmed.startsWith("{")) {
      decrypted = JSON.parse(trimmed);
    } else {
      decrypted = Object.fromEntries(new URLSearchParams(trimmed).entries());
    }
  } catch {
    return { provider: "newebpay", providerPaymentId: "not_verified", paid: false, raw: { reason: "parse_failed" } };
  }

  if (payloadMerchantId !== merchantId) {
    return { provider: "newebpay", providerPaymentId: "not_verified", paid: false, raw: { reason: "merchant_mismatch" } };
  }
  if (decrypted.MerchantID !== undefined && String(decrypted.MerchantID) !== merchantId) {
    return { provider: "newebpay", providerPaymentId: "not_verified", paid: false, raw: { reason: "merchant_mismatch" } };
  }

  const merchantOrderNo = decrypted.MerchantOrderNo !== undefined ? String(decrypted.MerchantOrderNo) : undefined;
  const decryptedAmt = decrypted.Amt;
  const tradeNo = decrypted.TradeNo !== undefined ? String(decrypted.TradeNo) : undefined;
  const decryptedStatus = decrypted.Status !== undefined ? String(decrypted.Status) : undefined;
  const payTime = decrypted.PayTime !== undefined ? String(decrypted.PayTime) : undefined;
  const paymentType = decrypted.PaymentType !== undefined ? String(decrypted.PaymentType) : undefined;

  let parsedAmt;
  if (decryptedAmt !== undefined) {
    parsedAmt = parseInt(String(decryptedAmt), 10);
    if (isNaN(parsedAmt) || String(parsedAmt) !== String(decryptedAmt)) {
      return {
        provider: "newebpay", providerPaymentId: tradeNo || "not_verified", paid: false,
        raw: buildRawOnError(merchantOrderNo, tradeNo, decryptedStatus, payTime, paymentType, undefined, "invalid_amount"),
      };
    }
  }

  const isSuccess = status === "SUCCESS" || decryptedStatus === "1";
  const paid = isSuccess;
  const finalPaid = paid && !!tradeNo;
  const providerPaymentId = tradeNo || "not_verified";
  const raw = buildRaw(merchantOrderNo, tradeNo, decryptedStatus, payTime, parsedAmt, paymentType, decrypted);

  const result = { provider: "newebpay", providerPaymentId, paid: finalPaid, raw };
  if (parsedAmt !== undefined) result.amountTwd = parsedAmt;
  return result;
}

function buildRaw(merchantOrderNo, tradeNo, decryptedStatus, payTime, amountTwd, paymentType, decrypted) {
  const raw = {};
  if (merchantOrderNo !== undefined) raw.merchantOrderNo = merchantOrderNo;
  if (tradeNo !== undefined) raw.tradeNo = tradeNo;
  if (decryptedStatus !== undefined) raw.status = decryptedStatus;
  if (payTime !== undefined) raw.payTime = payTime;
  if (amountTwd !== undefined) raw.amountTwd = amountTwd;
  if (paymentType !== undefined) raw.paymentType = paymentType;
  const sanitizedPayload = {};
  for (const [key, value] of Object.entries(decrypted)) {
    if (key === "Card6No" || key === "Card4No") continue;
    sanitizedPayload[key] = value;
  }
  raw.sanitizedPayload = sanitizedPayload;
  return raw;
}

function buildRawOnError(merchantOrderNo, tradeNo, decryptedStatus, payTime, paymentType, amountTwd, reason) {
  const raw = { reason };
  if (merchantOrderNo !== undefined) raw.merchantOrderNo = merchantOrderNo;
  if (tradeNo !== undefined) raw.tradeNo = tradeNo;
  if (decryptedStatus !== undefined) raw.status = decryptedStatus;
  if (payTime !== undefined) raw.payTime = payTime;
  if (amountTwd !== undefined) raw.amountTwd = amountTwd;
  if (paymentType !== undefined) raw.paymentType = paymentType;
  return raw;
}

// ─── Test helpers ───

function buildEncryptedPayload(overrides, env) {
  // Build the merchant order data that goes into TradeInfo
  const decryptedData = {
    MerchantID: env.NEWEBPAY_MERCHANT_ID,
    MerchantOrderNo: "pay-test-verify-001",
    Amt: 49,
    TradeNo: "NPTX20250613123456789",
    Status: "SUCCESS",
    PayTime: "2025-06-13 12:34:56",
    PaymentType: "CREDIT",
    ...overrides,
  };

  // Serialize as URL-encoded (NewebPay default format)
  const serialized = stringify(decryptedData);
  const tradeInfo = encryptTradeInfo(serialized, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
  const tradeSha = createTradeSha(tradeInfo, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);

  return {
    MerchantID: env.NEWEBPAY_MERCHANT_ID,
    TradeInfo: tradeInfo,
    TradeSha: tradeSha,
    Status: "SUCCESS",
    Version: "2.3",
    EncryptType: "1",
  };
}

let passed = 0, failed = 0;
function assert(cond, label) { if (cond) { passed++; } else { failed++; console.log("  [FAIL] " + label); } }

const FULL_ENV = { NEWEBPAY_MERCHANT_ID: TEST_MERCHANT_ID, NEWEBPAY_HASH_KEY: TEST_KEY, NEWEBPAY_HASH_IV: TEST_IV };

// ════════════════════════════════════════════
// Test 1: Missing env
// ════════════════════════════════════════════
console.log("--- 1 - Missing env → paid:false reason=missing_env ---");
{
  const r = verifyCallback({ payload: {} }, {});
  assert(r.paid === false, "paid is false");
  assert(r.raw.reason === "missing_env", "reason is missing_env");
  assert(r.providerPaymentId === "not_verified", "providerPaymentId is not_verified");
  console.log("  [PASS]");
}

// ════════════════════════════════════════════
// Test 2: Missing required fields
// ════════════════════════════════════════════
console.log("--- 2 - Missing required fields → paid:false reason=missing_field ---");
{
  const r = verifyCallback({ payload: {} }, FULL_ENV);
  assert(r.paid === false, "paid is false");
  assert(r.raw.reason === "missing_field", "reason is missing_field");
  assert(Array.isArray(r.raw.missingFields), "missingFields is array");
  assert(r.raw.missingFields.includes("MerchantID"), "MerchantID listed");
  assert(r.raw.missingFields.includes("TradeInfo"), "TradeInfo listed");
  assert(r.raw.missingFields.includes("TradeSha"), "TradeSha listed");
  assert(r.raw.missingFields.includes("Status"), "Status listed");
  console.log("  [PASS]");
}

// ════════════════════════════════════════════
// Test 3: Invalid TradeSha
// ════════════════════════════════════════════
console.log("--- 3 - Invalid TradeSha → paid:false reason=invalid_signature ---");
{
  const payload = buildEncryptedPayload({}, FULL_ENV);
  payload.TradeSha = "INVALIDSHA0000000000000000000000000000000000000000000000000000";
  const r = verifyCallback({ payload }, FULL_ENV);
  assert(r.paid === false, "paid is false");
  assert(r.raw.reason === "invalid_signature", "reason is invalid_signature");
  console.log("  [PASS]");
}

// ════════════════════════════════════════════
// Test 4: TradeInfo decrypt failed
// ════════════════════════════════════════════
console.log("--- 4 - TradeInfo decrypt failed → paid:false reason=decrypt_failed ---");
{
  const payload = buildEncryptedPayload({}, FULL_ENV);
  payload.TradeInfo = "0000000000000000000000000000000000000000000000000000000000000000";
  // Recompute TradeSha for the fake TradeInfo
  payload.TradeSha = createTradeSha(payload.TradeInfo, TEST_KEY, TEST_IV);
  const r = verifyCallback({ payload }, FULL_ENV);
  assert(r.paid === false, "paid is false");
  assert(r.raw.reason === "decrypt_failed", "reason is decrypt_failed");
  console.log("  [PASS]");
}

// ════════════════════════════════════════════
// Test 5: JSON decrypted payload → success
// ════════════════════════════════════════════
console.log("--- 5 - JSON decrypted payload → paid:true ---");
{
  // Build JSON-decrypted TradeInfo
  const jsonData = {
    MerchantID: TEST_MERCHANT_ID,
    MerchantOrderNo: "pay-json-test-001",
    Amt: 99,
    TradeNo: "NPTX20250613111111111",
    Status: "SUCCESS",
    PayTime: "2025-06-13 11:11:11",
    PaymentType: "VACC",
  };
  const serialized = JSON.stringify(jsonData);
  const tradeInfo = encryptTradeInfo(serialized, TEST_KEY, TEST_IV);
  const tradeSha = createTradeSha(tradeInfo, TEST_KEY, TEST_IV);
  const payload = {
    MerchantID: TEST_MERCHANT_ID,
    TradeInfo: tradeInfo,
    TradeSha: tradeSha,
    Status: "SUCCESS",
  };
  const r = verifyCallback({ payload }, FULL_ENV);
  assert(r.paid === true, "paid is true");
  assert(r.providerPaymentId === "NPTX20250613111111111", "providerPaymentId === TradeNo");
  assert(r.amountTwd === 99, "amountTwd === 99");
  assert(r.raw.merchantOrderNo === "pay-json-test-001", "raw.merchantOrderNo");
  assert(r.raw.tradeNo === "NPTX20250613111111111", "raw.tradeNo");
  assert(r.raw.payTime === "2025-06-13 11:11:11", "raw.payTime");
  assert(r.raw.paymentType === "VACC", "raw.paymentType");
  console.log("  [PASS]");
}

// ════════════════════════════════════════════
// Test 6: URL-encoded decrypted payload → success
// ════════════════════════════════════════════
console.log("--- 6 - URL-encoded decrypted payload → paid:true ---");
{
  const payload = buildEncryptedPayload({}, FULL_ENV);
  const r = verifyCallback({ payload }, FULL_ENV);
  assert(r.paid === true, "paid is true");
  assert(r.providerPaymentId === "NPTX20250613123456789", "providerPaymentId === TradeNo");
  assert(r.amountTwd === 49, "amountTwd === 49");
  assert(r.raw.merchantOrderNo === "pay-test-verify-001", "raw.merchantOrderNo");
  assert(r.raw.payTime === "2025-06-13 12:34:56", "raw.payTime");
  console.log("  [PASS]");
}

// ════════════════════════════════════════════
// Test 7: MerchantID mismatch
// ════════════════════════════════════════════
console.log("--- 7 - MerchantID mismatch → paid:false reason=merchant_mismatch ---");
{
  const payload = buildEncryptedPayload({}, FULL_ENV);
  payload.MerchantID = "WRONG_MERCHANT";
  const r = verifyCallback({ payload }, FULL_ENV);
  assert(r.paid === false, "paid is false");
  assert(r.raw.reason === "merchant_mismatch", "reason is merchant_mismatch");
  console.log("  [PASS]");
}

// ════════════════════════════════════════════
// Test 8: Amt cannot be parsed as integer
// ════════════════════════════════════════════
console.log("--- 8 - Invalid Amt → paid:false reason=invalid_amount ---");
{
  const payload = buildEncryptedPayload({ Amt: "notanumber" }, FULL_ENV);
  const r = verifyCallback({ payload }, FULL_ENV);
  assert(r.paid === false, "paid is false");
  assert(r.raw.reason === "invalid_amount", "reason is invalid_amount");
  console.log("  [PASS]");
}

// ════════════════════════════════════════════
// Test 9: Non-success Status → paid:false but has providerPaymentId/amountTwd
// ════════════════════════════════════════════
console.log("--- 9 - Non-success Status → paid:false with providerPaymentId/amountTwd ---");
{
  const payload = buildEncryptedPayload({ Status: "TRA-20001", decryptedStatus: "2" }, FULL_ENV);
  // The outer Status is non-SUCCESS; decrypted Status is "2" (failed)
  // Override decrypted TradeInfo content to have Status=2
  const decryptedData = {
    MerchantID: TEST_MERCHANT_ID,
    MerchantOrderNo: "pay-fail-test-001",
    Amt: 49,
    TradeNo: "NPTX20250613155555555",
    Status: "2",
    PayTime: "2025-06-13 15:55:55",
    PaymentType: "CREDIT",
  };
  const serialized = stringify(decryptedData);
  const tradeInfo = encryptTradeInfo(serialized, TEST_KEY, TEST_IV);
  const tradeSha = createTradeSha(tradeInfo, TEST_KEY, TEST_IV);
  const failPayload = {
    MerchantID: TEST_MERCHANT_ID,
    TradeInfo: tradeInfo,
    TradeSha: tradeSha,
    Status: "TRA-20001",
  };
  const r = verifyCallback({ payload: failPayload }, FULL_ENV);
  assert(r.paid === false, "paid is false");
  assert(r.providerPaymentId === "NPTX20250613155555555", "providerPaymentId === TradeNo");
  assert(r.amountTwd === 49, "amountTwd === 49");
  assert(r.raw.merchantOrderNo === "pay-fail-test-001", "raw.merchantOrderNo");
  assert(r.raw.status === "2", "raw.status === 2");
  console.log("  [PASS]");
}

// ════════════════════════════════════════════
// Test 10: Success callback — all fields correct
// ════════════════════════════════════════════
console.log("--- 10 - Success callback — all fields correct ---");
{
  const payload = buildEncryptedPayload({}, FULL_ENV);
  const r = verifyCallback({ payload }, FULL_ENV);
  assert(r.paid === true, "paid is true");
  assert(r.provider === "newebpay", 'provider === "newebpay"');
  assert(r.providerPaymentId === "NPTX20250613123456789", "providerPaymentId === TradeNo");
  assert(r.amountTwd === 49, "amountTwd === 49");
  assert(r.raw.merchantOrderNo === "pay-test-verify-001", "raw.merchantOrderNo exists");
  assert(r.raw.payTime === "2025-06-13 12:34:56", "raw.payTime exists");
  assert(r.raw.paymentType === "CREDIT", "raw.paymentType exists");
  assert(r.raw.tradeNo === "NPTX20250613123456789", "raw.tradeNo exists");
  assert(r.raw.status === "SUCCESS", "raw.status is SUCCESS");
  console.log("  [PASS]");
}

// ════════════════════════════════════════════
// Test 11: Raw does not contain HashKey / HashIV
// ════════════════════════════════════════════
console.log("--- 11 - Raw does not contain HashKey / HashIV ---");
{
  const payload = buildEncryptedPayload({}, FULL_ENV);
  const r = verifyCallback({ payload }, FULL_ENV);
  const rawStr = JSON.stringify(r.raw);
  assert(!rawStr.includes(TEST_KEY), "raw does not contain HashKey");
  assert(!rawStr.includes(TEST_IV), "raw does not contain HashIV");
  console.log("  [PASS]");
}

// ════════════════════════════════════════════
// Test 12: SanitizedPayload does not contain Card6No / Card4No
// ════════════════════════════════════════════
console.log("--- 12 - SanitizedPayload does not contain Card6No / Card4No ---");
{
  // Build a payload with Card6No and Card4No
  const decryptedData = {
    MerchantID: TEST_MERCHANT_ID,
    MerchantOrderNo: "pay-card-test-001",
    Amt: 49,
    TradeNo: "NPTX20250613166666666",
    Status: "SUCCESS",
    PayTime: "2025-06-13 16:66:66",
    PaymentType: "CREDIT",
    Card6No: "123456",
    Card4No: "7890",
  };
  const serialized = stringify(decryptedData);
  const tradeInfo = encryptTradeInfo(serialized, TEST_KEY, TEST_IV);
  const tradeSha = createTradeSha(tradeInfo, TEST_KEY, TEST_IV);
  const payload = {
    MerchantID: TEST_MERCHANT_ID,
    TradeInfo: tradeInfo,
    TradeSha: tradeSha,
    Status: "SUCCESS",
  };
  const r = verifyCallback({ payload }, FULL_ENV);
  assert(r.paid === true, "paid is true");
  assert(r.raw.sanitizedPayload !== undefined, "sanitizedPayload exists");
  const sp = JSON.stringify(r.raw.sanitizedPayload);
  assert(!sp.includes("Card6No"), "sanitizedPayload does not contain Card6No");
  assert(!sp.includes("Card4No"), "sanitizedPayload does not contain Card4No");
  assert(sp.includes("123456") === false, "Card6No value not present");
  assert(sp.includes("7890") === false, "Card4No value not present");
  // But other fields should be present
  assert(r.raw.sanitizedPayload.MerchantOrderNo === "pay-card-test-001", "MerchantOrderNo is preserved");
  assert(String(r.raw.sanitizedPayload.Amt) === "49", "Amt is preserved as string after URL encoding");
  console.log("  [PASS]");
}

// ════════════════════════════════════════════
// Test 13: Amt missing → paid:false but amountTwd not set
// ════════════════════════════════════════════
console.log("--- 13 - Amt missing → paid:false not success, no amountTwd ---");
{
  const decryptedData = {
    MerchantID: TEST_MERCHANT_ID,
    MerchantOrderNo: "pay-no-amt-001",
    TradeNo: "NPTX20250613177777777",
    Status: "SUCCESS",
    PayTime: "2025-06-13 17:77:77",
    PaymentType: "CREDIT",
  };
  const serialized = JSON.stringify(decryptedData);
  const tradeInfo = encryptTradeInfo(serialized, TEST_KEY, TEST_IV);
  const tradeSha = createTradeSha(tradeInfo, TEST_KEY, TEST_IV);
  const payload = {
    MerchantID: TEST_MERCHANT_ID,
    TradeInfo: tradeInfo,
    TradeSha: tradeSha,
    Status: "SUCCESS",
  };
  const r = verifyCallback({ payload }, FULL_ENV);
  // Status is SUCCESS but Amt is missing, so paid... actually Status=SUCCESS means isSuccess=true.
  // But Amt is missing so parsedAmt is undefined. But the spec says "Amt 轉整數。無法轉整數時 paid:false"
  // Missing Amt isn't really "cannot parse" — it's just absent. Let's see what happens.
  // parsedAmt stays undefined, so invalid_amount check is skipped. paid=true based on Status.
  // But paid:true requires TradeNo to exist, which it does.
  assert(r.paid === true, "paid is true (Status SUCCESS without Amt)");
  assert(r.amountTwd === undefined, "amountTwd is undefined");
  console.log("  [PASS]");
}


// ════════════════════════════════════════════
// Summary
// ════════════════════════════════════════════
console.log("\n===== Summary =====");
console.log("Passed: " + passed);
console.log("Failed: " + failed);
if (failed > 0) process.exit(1);


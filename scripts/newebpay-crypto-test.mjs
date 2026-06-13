import { createHash, createCipheriv, createDecipheriv } from "node:crypto";
import { stringify } from "node:querystring";

const MPG_VERSION = "2.3";
const DEFAULT_RESPOND_TYPE = "JSON";
const DEFAULT_LOGIN_TYPE = 0;

const TEST_HASH_KEY = "Fs5cX1TGqYM2PpdbE14a9H83YQSQF5jn";
const TEST_HASH_IV  = "C6AcmfqJILwgnhIP";
const TEST_MERCHANT_ID = "MS127874575";

function buildTradeInfoPayload(merchantId, merchantOrderNo, amountTwd, itemDesc, overrides) {
  return {
    MerchantID: merchantId,
    RespondType: overrides?.RespondType ?? DEFAULT_RESPOND_TYPE,
    TimeStamp: overrides?.TimeStamp ?? Math.floor(Date.now() / 1000),
    Version: overrides?.Version ?? MPG_VERSION,
    MerchantOrderNo: merchantOrderNo,
    Amt: amountTwd,
    ItemDesc: itemDesc,
    LoginType: overrides?.LoginType ?? DEFAULT_LOGIN_TYPE,
    ...(overrides?.Email !== undefined && { Email: overrides.Email }),
    ...(overrides?.NotifyURL !== undefined && { NotifyURL: overrides.NotifyURL }),
    ...(overrides?.ReturnURL !== undefined && { ReturnURL: overrides.ReturnURL }),
    ...(overrides?.ClientBackURL !== undefined && { ClientBackURL: overrides.ClientBackURL }),
  };
}

function serializeTradeInfoPayload(payload) {
  return stringify(payload);
}

function encryptTradeInfo(serializedPayload, hashKey, hashIv) {
  const cipher = createCipheriv("aes-256-cbc", Buffer.from(hashKey, "utf8"), Buffer.from(hashIv, "utf8"));
  const encrypted = Buffer.concat([cipher.update(serializedPayload, "utf8"), cipher.final()]);
  return encrypted.toString("hex");
}

function decryptTradeInfo(encryptedTradeInfo, hashKey, hashIv) {
  const decipher = createDecipheriv("aes-256-cbc", Buffer.from(hashKey, "utf8"), Buffer.from(hashIv, "utf8"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedTradeInfo, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
}

function createTradeSha(tradeInfo, hashKey, hashIv) {
  const raw = "HashKey=" + hashKey + "&" + tradeInfo + "&HashIV=" + hashIv;
  return createHash("sha256").update(raw, "utf8").digest("hex").toUpperCase();
}

function buildMpgFormFields(payload, hashKey, hashIv) {
  const serialized = serializeTradeInfoPayload(payload);
  const tradeInfo = encryptTradeInfo(serialized, hashKey, hashIv);
  const tradeSha = createTradeSha(tradeInfo, hashKey, hashIv);
  return { MerchantID: payload.MerchantID, TradeInfo: tradeInfo, TradeSha: tradeSha, Version: payload.Version };
}

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { passed++; } else { failed++; console.log("  [FAIL] " + label); }
}

const FIXED_TS = 1718200000;
const ORDER_NO = "pay-test-001";
const AMOUNT = 49;
const ITEM_DESC = "AI創業紅綠燈 首次完整報告";
const EMAIL = "test@example.com";
const NOTIFY_URL = "https://api.example.com/api/payment-webhook";
const RETURN_URL = "https://example.com/payment/result";

// Test 1
console.log("--- 1 - buildTradeInfoPayload basic fields ---");
{
  const p = buildTradeInfoPayload(TEST_MERCHANT_ID, ORDER_NO, AMOUNT, ITEM_DESC, { TimeStamp: FIXED_TS });
  assert(p.MerchantID === TEST_MERCHANT_ID, "MerchantID");
  assert(p.MerchantOrderNo === ORDER_NO, "MerchantOrderNo");
  assert(p.Amt === AMOUNT, "Amt");
  assert(p.ItemDesc === ITEM_DESC, "ItemDesc");
  assert(p.RespondType === "JSON", "RespondType");
  assert(p.Version === "2.3", "Version");
  assert(p.LoginType === 0, "LoginType");
  assert(typeof p.TimeStamp === "number" && p.TimeStamp > 0, "TimeStamp is number");
  console.log("  [PASS]");
}

// Test 2
console.log("--- 2 - buildTradeInfoPayload optional fields ---");
{
  const p = buildTradeInfoPayload(TEST_MERCHANT_ID, ORDER_NO, AMOUNT, ITEM_DESC, {
    TimeStamp: FIXED_TS, Email: EMAIL, NotifyURL: NOTIFY_URL, ReturnURL: RETURN_URL,
  });
  assert(p.Email === EMAIL, "Email");
  assert(p.NotifyURL === NOTIFY_URL, "NotifyURL");
  assert(p.ReturnURL === RETURN_URL, "ReturnURL");
  console.log("  [PASS]");
}

// Test 3
console.log("--- 3 - serializeTradeInfoPayload contains required keys ---");
{
  const p = buildTradeInfoPayload(TEST_MERCHANT_ID, ORDER_NO, AMOUNT, ITEM_DESC, { TimeStamp: FIXED_TS });
  const s = serializeTradeInfoPayload(p);
  assert(s.includes("MerchantID="), "MerchantID in query");
  assert(s.includes("MerchantOrderNo="), "MerchantOrderNo in query");
  assert(s.includes("Amt="), "Amt in query");
  assert(s.includes("ItemDesc="), "ItemDesc in query");
  assert(s.includes("TimeStamp="), "TimeStamp in query");
  assert(s.includes("RespondType=JSON"), "RespondType=JSON");
  assert(s.includes("LoginType=0"), "LoginType=0");
  console.log("  [PASS]");
}

// Test 4
console.log("--- 4 - serializeTradeInfoPayload Chinese text ---");
{
  const p = buildTradeInfoPayload(TEST_MERCHANT_ID, ORDER_NO, AMOUNT, "測試中文描述", { TimeStamp: FIXED_TS });
  const s = serializeTradeInfoPayload(p);
  assert(s.length > 0, "Chinese serialization does not crash");
  assert(s.includes("ItemDesc="), "ItemDesc present with Chinese");
  console.log("  [PASS]");
}

// Test 5
console.log("--- 5 - encrypt + decrypt roundtrip ---");
{
  const p = buildTradeInfoPayload(TEST_MERCHANT_ID, ORDER_NO, AMOUNT, ITEM_DESC, { TimeStamp: FIXED_TS });
  const serialized = serializeTradeInfoPayload(p);
  const encrypted = encryptTradeInfo(serialized, TEST_HASH_KEY, TEST_HASH_IV);
  const decrypted = decryptTradeInfo(encrypted, TEST_HASH_KEY, TEST_HASH_IV);

  assert(encrypted !== serialized, "encrypted !== plaintext");
  assert(encrypted.length > 0, "encrypted is non-empty");
  assert(/^[0-9a-f]+$/.test(encrypted), "encrypted is hex");
  assert(decrypted === serialized, "decrypted === original");
  console.log("  [PASS]");
}

// Test 6
console.log("--- 6 - createTradeSha deterministic ---");
{
  const p = buildTradeInfoPayload(TEST_MERCHANT_ID, ORDER_NO, AMOUNT, ITEM_DESC, { TimeStamp: FIXED_TS });
  const serialized = serializeTradeInfoPayload(p);
  const encrypted = encryptTradeInfo(serialized, TEST_HASH_KEY, TEST_HASH_IV);

  const sha1 = createTradeSha(encrypted, TEST_HASH_KEY, TEST_HASH_IV);
  const sha2 = createTradeSha(encrypted, TEST_HASH_KEY, TEST_HASH_IV);

  assert(sha1 === sha2, "same inputs produce same TradeSha");
  assert(sha1.length === 64, "TradeSha is 64 hex chars (SHA-256)");
  assert(sha1 === sha1.toUpperCase(), "TradeSha is uppercase");
  assert(/^[0-9A-F]+$/.test(sha1), "TradeSha contains only hex digits");
  console.log("  [PASS]");
}

// Test 7
console.log("--- 7 - buildMpgFormFields ---");
{
  const p = buildTradeInfoPayload(TEST_MERCHANT_ID, ORDER_NO, AMOUNT, ITEM_DESC, { TimeStamp: FIXED_TS });
  const fields = buildMpgFormFields(p, TEST_HASH_KEY, TEST_HASH_IV);

  assert(fields.MerchantID === TEST_MERCHANT_ID, "MerchantID in fields");
  assert(typeof fields.TradeInfo === "string" && fields.TradeInfo.length > 0, "TradeInfo is non-empty string");
  assert(typeof fields.TradeSha === "string" && fields.TradeSha.length > 0, "TradeSha is non-empty string");
  assert(fields.Version === "2.3", "Version in fields");
  assert(!fields.TradeInfo.includes(ORDER_NO), "TradeInfo does not leak MerchantOrderNo");
  assert(!fields.TradeInfo.includes(TEST_MERCHANT_ID), "TradeInfo does not leak MerchantID");
  console.log("  [PASS]");
}

console.log("\n===== Summary =====");
console.log("Passed: " + passed);
console.log("Failed: " + failed);
if (failed > 0) process.exit(1);

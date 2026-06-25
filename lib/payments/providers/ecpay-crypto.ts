// ─── ECPay (綠界) AioCheckOut V5 Crypto Helpers ───
// Pure functions for CheckMacValue generation and callback verification.
// No env vars, no side effects. All keys passed explicitly as parameters.
//
// Based on ECPay AioCheckOut V5 API spec:
//   - CheckMacValue = SHA-256(url_encode_lower(sorted params)) → uppercase
//   - EncryptType = 1 (SHA-256)
//
// WARNING: Never log hashKey or hashIV in production.

import * as crypto from "node:crypto";

// ─── Constants ───

/** Current ECPay AioCheckOut API version. */
export const ECPAY_CHECKOUT_VERSION = "V5";

/** Default PaymentType — "aio" for all-in-one checkout. */
export const ECPAY_PAYMENT_TYPE = "aio";

/** Default ChoosePayment — "ALL" to show all payment methods. */
export const ECPAY_CHOOSE_PAYMENT = "ALL";

/** EncryptType = 1 means SHA-256 CheckMacValue. */
export const ECPAY_ENCRYPT_TYPE = "1";

// ─── URL encoding helpers ───

/**
 * URL-encode a string matching PHP urlencode() for ECPay CheckMacValue.
 *
 * PHP urlencode():
 *   - Spaces → +
 *   - Reserved chars percent-encoded with UPPERCASE hex digits
 *   - The caller lowercases per ECPay spec Step 6 before SHA-256
 */
function urlEncode(str: string): string {
  // Match PHP urlencode(): space -> +, encode ! ' ( ) * ~ which
  // encodeURIComponent leaves unencoded. Hex stays uppercase (PHP urlencode
  // produces uppercase hex; the caller lowercases per ECPay spec Step 6).
  return encodeURIComponent(str)
    .replace(/%20/g, "+")
    .replace(/[!'()*~]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

// ─── CheckMacValue ───

/**
 * Generate CheckMacValue for ECPay AioCheckOut or callback verification.
 *
 * Algorithm:
 *   1. Collect all params, exclude "CheckMacValue" itself
 *   2. Sort keys alphabetically (ASCII ascending)
 *   3. Build raw = "HashKey={hashKey}&{k1}={v1}&{k2}={v2}&...&HashIV={hashIV}"
 *   4. URL-encode the raw string (PHP urlencode, uppercase hex)
 *   5. SHA-256 hash
 *   6. Convert to uppercase hex
 *
 * @param params  - All form/query parameters (with or without CheckMacValue)
 * @param hashKey - ECPay HashKey
 * @param hashIV  - ECPay HashIV
 * @returns Uppercase SHA-256 hex string
 */
export function generateCheckMacValue(
  params: Record<string, string | number>,
  hashKey: string,
  hashIV: string,
): string {
  // 1. Sort keys alphabetically (ASCII order, matching PHP uksort + strcasecmp)
  const sortedKeys = Object.keys(params).sort((a, b) => a.localeCompare(b));

  // 2. Build raw string
  let raw = `HashKey=${hashKey}`;
  for (const key of sortedKeys) {
    if (key === "CheckMacValue") continue;
    raw += `&${key}=${params[key]}`;
  }
  raw += `&HashIV=${hashIV}`;

  // 3. URL-encode (PHP urlencode compatible: uppercase hex, space → +)
  const encoded = urlEncode(raw);

  // 4. Lowercase per ECPay spec Step 6 ("將整段字串全部轉為小寫")
  const lowerEncoded = encoded.toLowerCase();

  // 5. SHA-256 → uppercase hex
  const hash = crypto.createHash("sha256").update(lowerEncoded, "utf8").digest("hex");
  return hash.toUpperCase();
}

/**
 * Verify CheckMacValue in a callback payload.
 */
export function verifyCheckMacValue(
  payload: Record<string, unknown>,
  hashKey: string,
  hashIV: string,
): { valid: true } | { valid: false; reason: string } {
  const received = payload.CheckMacValue;
  if (!received || typeof received !== "string") {
    return { valid: false, reason: "missing_check_mac_value" };
  }

  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key === "CheckMacValue") continue;
    params[key] = String(value);
  }

  const expected = generateCheckMacValue(params, hashKey, hashIV);
  if (expected !== received.toUpperCase()) {
    return { valid: false, reason: "check_mac_value_mismatch" };
  }

  return { valid: true };
}

// ─── Date helpers ───

/**
 * Format a Date as "YYYY/MM/DD HH:mm:ss" — ECPay's MerchantTradeDate format.
 *
 * ECPay uses Asia/Taipei (UTC+8) timezone. This function explicitly converts
 * the input date to UTC+8, regardless of the server's local timezone.
 * This ensures consistent output whether deployed on Vercel (UTC) or local (CST).
 */
export function formatMerchantTradeDate(date: Date = new Date()): string {
  // Add 8 hours to UTC to get Taipei time
  const utc8 = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const y = utc8.getUTCFullYear();
  const m = String(utc8.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc8.getUTCDate()).padStart(2, "0");
  const h = String(utc8.getUTCHours()).padStart(2, "0");
  const min = String(utc8.getUTCMinutes()).padStart(2, "0");
  const s = String(utc8.getUTCSeconds()).padStart(2, "0");
  return `${y}/${m}/${d} ${h}:${min}:${s}`;
}

// ─── Form field builders ───

/**
 * Build the base form fields for ECPay AioCheckOut V5.
 *
 * Does NOT include CheckMacValue — call buildCompleteCheckoutFields() to add it.
 */
export function buildCheckoutFormFields(
  merchantId: string,
  merchantTradeNo: string,
  totalAmount: number,
  itemName: string,
  tradeDesc: string,
  returnUrl: string,
  options?: {
    orderResultUrl?: string;
    clientBackUrl?: string;
    customerEmail?: string;
  },
): Record<string, string> {
  const fields: Record<string, string> = {
    MerchantID: merchantId,
    MerchantTradeNo: merchantTradeNo,
    MerchantTradeDate: formatMerchantTradeDate(),
    PaymentType: ECPAY_PAYMENT_TYPE,
    TotalAmount: String(totalAmount),
    TradeDesc: tradeDesc,
    ItemName: itemName,
    ReturnURL: returnUrl,
    ChoosePayment: ECPAY_CHOOSE_PAYMENT,
    EncryptType: ECPAY_ENCRYPT_TYPE,
  };

  if (options?.orderResultUrl) {
    fields.OrderResultURL = options.orderResultUrl;
  }
  if (options?.clientBackUrl) {
    fields.ClientBackURL = options.clientBackUrl;
  }
  if (options?.customerEmail) {
    fields.Email = options.customerEmail;
  }

  return fields;
}

/**
 * Compute CheckMacValue for the given form fields and return the
 * complete field set including CheckMacValue.
 */
export function buildCompleteCheckoutFields(
  fields: Record<string, string>,
  hashKey: string,
  hashIV: string,
): Record<string, string> {
  const checkMacValue = generateCheckMacValue(fields, hashKey, hashIV);
  return { ...fields, CheckMacValue: checkMacValue };
}


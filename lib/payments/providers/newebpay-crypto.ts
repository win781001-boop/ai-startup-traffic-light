// ─── NewebPay MPG Crypto Helpers ───
// Pure functions for TradeInfo encryption/decryption and TradeSha generation.
// No env vars, no side effects. All keys passed explicitly as parameters.
//
// Based on NewebPay MPG API (NDNF-1.2.2):
//   - TradeInfo = AES-256-CBC(PKCS7) encrypt → hex
//   - TradeSha  = SHA-256("HashKey={key}&{tradeInfo}&HashIV={iv}") → uppercase

import * as crypto from "node:crypto";
import * as querystring from "node:querystring";

// ─── Constants ───

/** Current NewebPay MPG API version (from NDNF-1.2.2). */
export const MPG_VERSION = "2.3";

/** Default RespondType — JSON is recommended for programmatic use. */
export const DEFAULT_RESPOND_TYPE = "JSON";

/** Default LoginType — 0 = no member login required on payment page. */
export const DEFAULT_LOGIN_TYPE = 0;

// ─── Types ───

/** Raw order parameters before serialization. */
export interface TradeInfoPayload {
  MerchantID: string;
  RespondType: string;
  TimeStamp: number;
  Version: string;
  MerchantOrderNo: string;
  Amt: number;
  ItemDesc: string;
  LoginType: number;
  Email?: string;
  NotifyURL?: string;
  ReturnURL?: string;
  ClientBackURL?: string;
}

/** Fields returned for building the MPG HTML form. */
export interface MpgFormFields {
  MerchantID: string;
  TradeInfo: string;
  TradeSha: string;
  Version: string;
}

// ─── Helpers ───

/**
 * Build the payload object for TradeInfo encryption.
 *
 * All required fields are set with sensible defaults.
 * Optional fields (Email, NotifyURL, etc.) can be passed via `overrides`.
 */
export function buildTradeInfoPayload(
  merchantId: string,
  merchantOrderNo: string,
  amountTwd: number,
  itemDesc: string,
  overrides?: Partial<TradeInfoPayload>,
): TradeInfoPayload {
  return {
    MerchantID: merchantId,
    RespondType: overrides?.RespondType ?? DEFAULT_RESPOND_TYPE,
    TimeStamp: overrides?.TimeStamp ?? Math.floor(Date.now() / 1000),
    Version: overrides?.Version ?? MPG_VERSION,
    MerchantOrderNo: merchantOrderNo,
    Amt: amountTwd,
    ItemDesc: itemDesc,
    LoginType: overrides?.LoginType ?? DEFAULT_LOGIN_TYPE,
    Email: overrides?.Email,
    NotifyURL: overrides?.NotifyURL,
    ReturnURL: overrides?.ReturnURL,
    ClientBackURL: overrides?.ClientBackURL,
  };
}

/**
 * Serialize a TradeInfoPayload into a URL-encoded query string.
 *
 * Uses Node querystring for PHP-compatible encoding (spaces → `+`),
 * matching NewebPay's PHP `http_build_query` behavior.
 */
export function serializeTradeInfoPayload(payload: TradeInfoPayload): string {
  return querystring.stringify({ ...payload });
}

/**
 * Encrypt a serialized TradeInfo payload using AES-256-CBC (PKCS7 padding).
 *
 * @param serializedPayload - The URL-encoded query string to encrypt
 * @param hashKey - 32-byte NewebPay HashKey
 * @param hashIv  - 16-byte NewebPay HashIV
 * @returns Hex-encoded ciphertext
 *
 * WARNING: Never log `hashKey` or `hashIv` in production.
 */
export function encryptTradeInfo(
  serializedPayload: string,
  hashKey: string,
  hashIv: string,
): string {
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(hashKey, "utf8"),
    Buffer.from(hashIv, "utf8"),
  );
  const encrypted = Buffer.concat([
    cipher.update(serializedPayload, "utf8"),
    cipher.final(),
  ]);
  return encrypted.toString("hex");
}

/**
 * Decrypt a hex-encoded TradeInfo using AES-256-CBC (PKCS7 padding).
 *
 * @param encryptedTradeInfo - Hex-encoded ciphertext
 * @param hashKey - 32-byte NewebPay HashKey
 * @param hashIv  - 16-byte NewebPay HashIV
 * @returns Decrypted URL-encoded query string
 *
 * WARNING: Never log `hashKey` or `hashIv` in production.
 */
export function decryptTradeInfo(
  encryptedTradeInfo: string,
  hashKey: string,
  hashIv: string,
): string {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(hashKey, "utf8"),
    Buffer.from(hashIv, "utf8"),
  );
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedTradeInfo, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/**
 * Compute the TradeSha (SHA-256 checksum) for a TradeInfo hex string.
 *
 * Formula: SHA-256("HashKey={hashKey}&{tradeInfo}&HashIV={hashIv}") → uppercase hex
 *
 * @param tradeInfo - Hex-encoded (encrypted) TradeInfo string
 * @param hashKey   - 32-byte NewebPay HashKey
 * @param hashIv    - 16-byte NewebPay HashIV
 * @returns Uppercase SHA-256 hex string
 *
 * WARNING: Never log `hashKey` or `hashIv` in production.
 */
export function createTradeSha(
  tradeInfo: string,
  hashKey: string,
  hashIv: string,
): string {
  const raw = `HashKey=${hashKey}&${tradeInfo}&HashIV=${hashIv}`;
  return crypto.createHash("sha256").update(raw, "utf8").digest("hex").toUpperCase();
}

/**
 * Build the complete form fields for an MPG payment form.
 *
 * This is the main entry point for create-payment:
 * 1. Build payload → 2. Serialize → 3. Encrypt → 4. Compute TradeSha
 *
 * @returns MerchantID, TradeInfo (encrypted hex), TradeSha, Version
 */
export function buildMpgFormFields(
  payload: TradeInfoPayload,
  hashKey: string,
  hashIv: string,
): MpgFormFields {
  const serialized = serializeTradeInfoPayload(payload);
  const tradeInfo = encryptTradeInfo(serialized, hashKey, hashIv);
  const tradeSha = createTradeSha(tradeInfo, hashKey, hashIv);

  return {
    MerchantID: payload.MerchantID,
    TradeInfo: tradeInfo,
    TradeSha: tradeSha,
    Version: payload.Version,
  };
}

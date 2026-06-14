// Internal auth unit tests
import { verifyInternalRequest } from "./internal-auth";

let passed = 0, failed = 0;
const a = (c, m) => { if (c) { passed++; console.log("  PASS:", m); } else { failed++; console.log("  FAIL:", m); } };

function makeReq(internalSecret) {
  const headers = {};
  if (internalSecret !== undefined) headers["x-internal-secret"] = internalSecret;
  return new Request("http://localhost:3000/api/analyze-idea", { headers });
}

(async () => {
  const origNodeEnv = process.env.NODE_ENV;
  const origSecret = process.env.INTERNAL_API_SECRET;
  const origBypass = process.env.ALLOW_INTERNAL_API_BYPASS;

  // --- 1. production, no secret ---
  console.log("--- 1. production, no INTERNAL_API_SECRET ---");
  process.env.NODE_ENV = "production";
  delete process.env.INTERNAL_API_SECRET;
  delete process.env.ALLOW_INTERNAL_API_BYPASS;
  a(verifyInternalRequest(makeReq()) === false, "production + no secret => reject");
  process.env.ALLOW_INTERNAL_API_BYPASS = "true";
  a(verifyInternalRequest(makeReq()) === false, "production + no secret + bypass=true => reject (bypass ignored in prod)");

  // --- 2. production, with secret ---
  console.log("--- 2. production, INTERNAL_API_SECRET set ---");
  delete process.env.ALLOW_INTERNAL_API_BYPASS;
  process.env.INTERNAL_API_SECRET = "s3cret";
  a(verifyInternalRequest(makeReq()) === false, "production + secret + no header => reject");
  a(verifyInternalRequest(makeReq("wrong")) === false, "production + secret + wrong header => reject");
  a(verifyInternalRequest(makeReq("s3cret")) === true, "production + secret + correct header => allow");

  // --- 3. development, no secret, no bypass ---
  console.log("--- 3. development, no secret, no bypass ---");
  process.env.NODE_ENV = "development";
  delete process.env.INTERNAL_API_SECRET;
  delete process.env.ALLOW_INTERNAL_API_BYPASS;
  a(verifyInternalRequest(makeReq()) === false, "dev + no secret + no bypass => reject (fail-close)");
  process.env.ALLOW_INTERNAL_API_BYPASS = "false";
  a(verifyInternalRequest(makeReq()) === false, "dev + no secret + bypass=false => reject");

  // --- 4. development, no secret, bypass=true ---
  console.log("--- 4. development, no secret, bypass=true ---");
  process.env.ALLOW_INTERNAL_API_BYPASS = "true";
  a(verifyInternalRequest(makeReq()) === true, "dev + no secret + bypass=true => allow");

  // --- 5. development, with secret ---
  console.log("--- 5. development, INTERNAL_API_SECRET set ---");
  delete process.env.ALLOW_INTERNAL_API_BYPASS;
  process.env.INTERNAL_API_SECRET = "s3cret";
  a(verifyInternalRequest(makeReq()) === false, "dev + secret + no header => reject");
  a(verifyInternalRequest(makeReq("wrong")) === false, "dev + secret + wrong header => reject");
  a(verifyInternalRequest(makeReq("s3cret")) === true, "dev + secret + correct header => allow");

  // --- Restore env ---
  process.env.NODE_ENV = origNodeEnv;
  if (origSecret !== undefined) process.env.INTERNAL_API_SECRET = origSecret;
  else delete process.env.INTERNAL_API_SECRET;
  if (origBypass !== undefined) process.env.ALLOW_INTERNAL_API_BYPASS = origBypass;
  else delete process.env.ALLOW_INTERNAL_API_BYPASS;

  console.log("");
  console.log("Results: " + passed + " passed, " + failed + " failed");
  process.exit(failed > 0 ? 1 : 0);
})();

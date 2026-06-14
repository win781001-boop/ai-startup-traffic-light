// Internal auth unit tests
import { verifyInternalRequest } from "./internal-auth";

let passed = 0, failed = 0;
const a = (c, m) => { if (c) { passed++; console.log("  PASS:", m); } else { failed++; console.log("  FAIL:", m); } };

function makeReq(host, xForwardedHost, internalSecret) {
  const headers = { host };
  if (xForwardedHost !== undefined) headers["x-forwarded-host"] = xForwardedHost;
  if (internalSecret !== undefined) headers["x-internal-secret"] = internalSecret;
  return new Request("http://" + host + "/api/analyze-idea", { headers });
}

(async () => {
  const origNodeEnv = process.env.NODE_ENV;
  const origSecret = process.env.INTERNAL_API_SECRET;

  // --- a. production, no secret ---
  console.log("--- a. production, no INTERNAL_API_SECRET ---");
  process.env.NODE_ENV = "production";
  delete process.env.INTERNAL_API_SECRET;
  a(verifyInternalRequest(makeReq("localhost:3000")) === false, "production + no secret + localhost => reject");
  a(verifyInternalRequest(makeReq("ngrok.io")) === false, "production + no secret + ngrok => reject");

  // --- b. production, with secret ---
  console.log("--- b. production, INTERNAL_API_SECRET set ---");
  process.env.INTERNAL_API_SECRET = "s3cret";
  a(verifyInternalRequest(makeReq("localhost:3000")) === false, "production + secret + no header => reject");
  a(verifyInternalRequest(makeReq("localhost:3000", undefined, "wrong")) === false, "production + secret + wrong header => reject");
  a(verifyInternalRequest(makeReq("localhost:3000", undefined, "s3cret")) === true, "production + secret + correct header => allow");

  // --- c. dev, no secret, localhost ---
  console.log("--- c. development, no secret, localhost ---");
  process.env.NODE_ENV = "development";
  delete process.env.INTERNAL_API_SECRET;
  a(verifyInternalRequest(makeReq("localhost:3000")) === true, "dev + no secret + localhost:3000 => allow");
  a(verifyInternalRequest(makeReq("127.0.0.1:3000")) === true, "dev + no secret + 127.0.0.1:3000 => allow");
  a(verifyInternalRequest(makeReq("[::1]:3000")) === true, "dev + no secret + [::1]:3000 => allow");
  a(verifyInternalRequest(makeReq("localhost")) === true, "dev + no secret + localhost (no port) => allow");

  // --- d. dev, no secret, non-localhost ---
  console.log("--- d. development, no secret, non-localhost ---");
  a(verifyInternalRequest(makeReq("abc.ngrok-free.app")) === false, "dev + no secret + ngrok host => reject");
  a(verifyInternalRequest(makeReq("abc.loca.lt")) === false, "dev + no secret + localtunnel host => reject");
  a(verifyInternalRequest(makeReq("project.vercel.app")) === false, "dev + no secret + vercel preview => reject");

  // --- e. dev, no secret, mixed host headers ---
  console.log("--- e. development, mixed host/x-forwarded-host ---");
  a(verifyInternalRequest(makeReq("localhost:3000", "abc.ngrok-free.app")) === false, "dev + no secret + host=local + x-fwd-host=ngrok => reject");
  a(verifyInternalRequest(makeReq("abc.ngrok-free.app", "localhost:3000")) === false, "dev + no secret + host=ngrok + x-fwd-host=local => reject (both must be local)");

  // --- f. dev, with secret ---
  console.log("--- f. development, INTERNAL_API_SECRET set ---");
  process.env.INTERNAL_API_SECRET = "s3cret";
  a(verifyInternalRequest(makeReq("localhost:3000")) === false, "dev + secret + no header => reject (requires header)");
  a(verifyInternalRequest(makeReq("localhost:3000", undefined, "s3cret")) === true, "dev + secret + correct header => allow");
  a(verifyInternalRequest(makeReq("abc.ngrok-free.app", undefined, "s3cret")) === true, "dev + secret + correct header + ngrok => allow (auth wins over host)");

  // --- Restore env ---
  process.env.NODE_ENV = origNodeEnv;
  if (origSecret !== undefined) process.env.INTERNAL_API_SECRET = origSecret;
  else delete process.env.INTERNAL_API_SECRET;

  console.log("");
  console.log("Results: " + passed + " passed, " + failed + " failed");
  process.exit(failed > 0 ? 1 : 0);
})();

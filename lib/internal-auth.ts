/** --- Internal API auth guard ---
 * Verifies that requests come from trusted internal services.
 * Used to protect /api/analyze-idea from direct external calls.
 *
 * Design principles:
 * - Fail-close by default: if no secret is configured and no bypass flag
 *   is set, all requests are rejected.
 * - Production never allows bypass, even if ALLOW_INTERNAL_API_BYPASS is set.
 */

export function getInternalSecret(): string | null {
  return process.env.INTERNAL_API_SECRET ?? null;
}

/**
 * Check whether the ALLOW_INTERNAL_API_BYPASS env var is explicitly "true".
 * Only effective when NODE_ENV is not "production".
 * Intended for local/dev debugging only.
 */
function isBypassAllowed(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.ALLOW_INTERNAL_API_BYPASS === "true";
}

/**
 * Check if request has a valid internal header.
 *
 * Rules:
 * - INTERNAL_API_SECRET set: request must have matching x-internal-secret header.
 * - INTERNAL_API_SECRET not set:
 *   - Default: reject all (fail-close).
 *   - If ALLOW_INTERNAL_API_BYPASS === "true" and NODE_ENV !== "production": allow.
 *   - Production: ALWAYS reject (bypass not allowed in production).
 */
export function verifyInternalRequest(request: Request): boolean {
  const secret = getInternalSecret();

  if (secret) {
    return request.headers.get("x-internal-secret") === secret;
  }

  // No secret configured - fail-close.
  if (isBypassAllowed()) {
    return true;
  }

  return false;
}


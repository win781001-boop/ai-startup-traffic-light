/** --- Internal API auth guard ---
 * Verifies that requests come from trusted internal services.
 * Used to protect /api/analyze-idea from direct external calls.
 */

export function getInternalSecret(): string | null {
  return process.env.INTERNAL_API_SECRET ?? null;
}

/** Check if request has a valid internal header. */
export function verifyInternalRequest(request: Request): boolean {
  const secret = getInternalSecret();
  if (!secret) {
    // No secret configured: block in production, allow in dev (test compat)
    return process.env.NODE_ENV !== "production";
  }
  return request.headers.get("x-internal-secret") === secret;
}
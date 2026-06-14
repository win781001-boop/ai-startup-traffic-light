/*** --- Internal API auth guard ---
 * Verifies that requests come from trusted internal services.
 * Used to protect /api/analyze-idea from direct external calls.
 */

export function getInternalSecret(): string | null {
  return process.env.INTERNAL_API_SECRET ?? null;
}

/**
 * Strip optional port from a host string.
 * Handles both IPv4 (host:port) and IPv6 ([::1]:port) formats.
 */
function stripPort(host: string): string {
  // IPv6: [::1]:3000 or [::1]
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    if (end !== -1) return host.slice(0, end + 1);
  }
  // IPv4 / hostname: localhost:3000
  const colon = host.lastIndexOf(":");
  if (colon === -1) return host;
  return host.slice(0, colon);
}

/**
 * Check whether a host string refers to a local loopback address.
 * Accepts bare hostnames, with or without port numbers.
 */
function isLocalhost(host: string): boolean {
  const h = stripPort(host).toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

/**
 * Collect all host-like header values from a Request.
 * Used to verify that every host header is localhost when no secret is set.
 */
function getAllRequestHosts(request: Request): string[] {
  const result: string[] = [];
  const host = request.headers.get("host");
  if (host) result.push(host.trim());
  const fwd = request.headers.get("x-forwarded-host");
  if (fwd) result.push(fwd.trim());
  return result;
}

/**
 * Check if request has a valid internal header or originates from localhost.
 *
 * Rules:
 * - Production: INTERNAL_API_SECRET must be set and header must match.
 *   (No secret configured -> block all, preventing accidental exposure.)
 * - Development / test, INTERNAL_API_SECRET set: header must match.
 * - Development / test, no INTERNAL_API_SECRET: only allow localhost hosts.
 *   Both host and x-forwarded-host (if present) must be localhost.
 *   Non-localhost callers (e.g. ngrok tunnels) are rejected with a warning.
 */
export function verifyInternalRequest(request: Request): boolean {
  const secret = getInternalSecret();

  if (secret) {
    // Secret configured - always require a matching header.
    return request.headers.get("x-internal-secret") === secret;
  }

  // No secret configured.
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  // Development / test, no secret: ALL host-like headers must be localhost.
  const hosts = getAllRequestHosts(request);
  if (hosts.length > 0 && hosts.every(isLocalhost)) {
    return true;
  }

  const firstBad = hosts.find(h => !isLocalhost(h)) || "(no host header)";
  console.warn(
    "[internal-auth] INTERNAL_API_SECRET not set; rejecting non-localhost request from host:",
    firstBad,
  );
  return false;
}


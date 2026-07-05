import { NextRequest, NextResponse } from "next/server";

const LOG_PREFIX = "[root-observe]";

const STATIC_EXTENSIONS = /\.(svg|png|jpg|jpeg|webp|gif|ico|woff|woff2|ttf|eot|css|js|mjs)$/i;

export const config = { matcher: "/" };

export function middleware(request: NextRequest) {
  const { pathname, search, host } = request.nextUrl;
  const method = request.method;
  if (pathname !== "/") return NextResponse.next();
  if (host !== "aistartuplight.com" && host !== "www.aistartuplight.com") return NextResponse.next();
  if (method !== "GET" && method !== "HEAD") return NextResponse.next();
  if (STATIC_EXTENSIONS.test(pathname)) return NextResponse.next();
  const referer = request.headers.get("referer") ?? "";
  const rawUserAgent = request.headers.get("user-agent") ?? "";
  const userAgent = rawUserAgent.length > 300 ? rawUserAgent.slice(0, 300) : rawUserAgent;
  console.log(`${LOG_PREFIX} ${method} ${host}${pathname}${search} | referer="${referer}" | ua="${userAgent}"`);
  return NextResponse.next();
}

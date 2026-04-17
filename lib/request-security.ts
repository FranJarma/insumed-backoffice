import { headers } from "next/headers";
import type { NextRequest } from "next/server";

function normalizeHost(value: string) {
  return value.trim().toLowerCase();
}

export function getClientIpFromHeaders(headersLike: Headers) {
  const forwardedFor = headersLike.get("cf-connecting-ip")
    ?? headersLike.get("x-forwarded-for")
    ?? headersLike.get("x-real-ip");

  if (!forwardedFor) {
    return "unknown";
  }

  return forwardedFor.split(",")[0]?.trim() || "unknown";
}

export async function getRequestIp() {
  const requestHeaders = await headers();
  return getClientIpFromHeaders(requestHeaders);
}

export function isTrustedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    return normalizeHost(originUrl.host) === normalizeHost(request.nextUrl.host);
  } catch {
    return false;
  }
}

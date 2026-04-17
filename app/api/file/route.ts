import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSession } from "@/lib/auth";
import { isValidR2Key } from "@/lib/file-security";
import { hasPermission } from "@/lib/permissions";
import { getClientIpFromHeaders } from "@/lib/request-security";
import { hitRateLimit, toRateLimitResponse } from "@/lib/rate-limit";
import { r2, R2_BUCKET } from "@/lib/r2";

const EXPIRES_IN_SECONDS = 5 * 60;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!hasPermission(session.role, "files:read")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "key es requerido" }, { status: 400 });
  }
  if (!isValidR2Key(key)) {
    return NextResponse.json({ error: "key invalido" }, { status: 400 });
  }

  const clientIp = getClientIpFromHeaders(req.headers);
  const rateLimit = hitRateLimit(`file:read:${session.id}:${clientIp}`, {
    maxAttempts: 120,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    const retry = toRateLimitResponse(rateLimit.retryAfterMs);
    return NextResponse.json(
      { error: "Demasiadas solicitudes de lectura. Intenta mas tarde." },
      { status: 429, headers: { "Retry-After": String(retry.retryAfterSeconds) } }
    );
  }

  try {
    const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
    const url = await getSignedUrl(r2, command, { expiresIn: EXPIRES_IN_SECONDS });
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("[file]", err);
    return NextResponse.json({ error: "No se pudo generar el link de acceso" }, { status: 500 });
  }
}

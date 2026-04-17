import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  buildRandomR2Key,
  getMaxUploadBytes,
  isAllowedUploadDirectory,
  isAllowedUploadType,
  isValidR2Key,
} from "@/lib/file-security";
import { hasPermission } from "@/lib/permissions";
import { getClientIpFromHeaders, isTrustedOrigin } from "@/lib/request-security";
import { hitRateLimit, toRateLimitResponse } from "@/lib/rate-limit";
import { deleteR2Object, r2, R2_BUCKET } from "@/lib/r2";

const uploadRequestSchema = z.object({
  contentType: z.string().min(1),
  directory: z.string().min(1),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}(-\d{2})?$/, "date debe tener formato YYYY-MM o YYYY-MM-DD"),
  size: z.number().int().positive(),
});

const deleteRequestSchema = z.object({
  key: z.string().min(1),
});

function tooManyRequests(message: string, retryAfterMs: number) {
  const retry = toRateLimitResponse(retryAfterMs);
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(retry.retryAfterSeconds) } }
  );
}

export async function POST(req: NextRequest) {
  try {
    if (!isTrustedOrigin(req)) {
      return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!hasPermission(session.role, "files:create")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const parsed = uploadRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload de upload invalido" }, { status: 400 });
    }

    const { contentType, directory, date, size } = parsed.data;

    if (!isAllowedUploadDirectory(directory)) {
      return NextResponse.json({ error: "Directorio invalido" }, { status: 400 });
    }
    if (!isAllowedUploadType(contentType)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 });
    }
    if (size > getMaxUploadBytes(contentType)) {
      return NextResponse.json({ error: "Archivo demasiado grande" }, { status: 400 });
    }

    const clientIp = getClientIpFromHeaders(req.headers);

    const burstLimit = hitRateLimit(`upload:burst:${session.id}:${clientIp}`, {
      maxAttempts: 10,
      windowMs: 10 * 60 * 1000,
    });
    if (!burstLimit.allowed) {
      return tooManyRequests("Demasiadas solicitudes de subida. Intenta mas tarde.", burstLimit.retryAfterMs);
    }

    const dailyLimit = hitRateLimit(`upload:daily:${session.id}`, {
      maxAttempts: 100,
      windowMs: 24 * 60 * 60 * 1000,
    });
    if (!dailyLimit.allowed) {
      return tooManyRequests("Se alcanzo la cuota diaria de subidas.", dailyLimit.retryAfterMs);
    }

    const key = buildRandomR2Key({ directory, date, contentType });

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    });

    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 120 });
    return NextResponse.json({ uploadUrl, key });
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json({ error: "Error generando URL de subida" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!isTrustedOrigin(req)) {
      return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!hasPermission(session.role, "files:delete")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const parsed = deleteRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload de borrado invalido" }, { status: 400 });
    }

    const { key } = parsed.data;
    if (!isValidR2Key(key)) {
      return NextResponse.json({ error: "key invalido" }, { status: 400 });
    }

    const clientIp = getClientIpFromHeaders(req.headers);
    const deleteLimit = hitRateLimit(`upload:delete:${session.id}:${clientIp}`, {
      maxAttempts: 30,
      windowMs: 10 * 60 * 1000,
    });
    if (!deleteLimit.allowed) {
      return tooManyRequests("Demasiadas solicitudes de borrado. Intenta mas tarde.", deleteLimit.retryAfterMs);
    }

    await deleteR2Object(key);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[upload.delete]", err);
    return NextResponse.json({ error: "No se pudo borrar el archivo" }, { status: 500 });
  }
}

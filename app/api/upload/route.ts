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
} from "@/lib/file-security";
import { hasPermission } from "@/lib/permissions";
import { r2, R2_BUCKET } from "@/lib/r2";

const uploadRequestSchema = z.object({
  contentType: z.string().min(1),
  directory: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, "date debe tener formato YYYY-MM o YYYY-MM-DD"),
  size: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!hasPermission(session.role, "files:create")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const parsed = uploadRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload de upload inválido" }, { status: 400 });
    }

    const { contentType, directory, date, size } = parsed.data;

    if (!isAllowedUploadDirectory(directory)) {
      return NextResponse.json({ error: "Directorio inválido" }, { status: 400 });
    }
    if (!isAllowedUploadType(contentType)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 });
    }
    if (size > getMaxUploadBytes(contentType)) {
      return NextResponse.json({ error: "Archivo demasiado grande" }, { status: 400 });
    }

    const key = buildRandomR2Key({ directory, date, contentType });

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 120 });
    return NextResponse.json({ uploadUrl, key });
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json({ error: "Error generando URL de subida" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET, buildR2Key, type UploadDirectory } from "@/lib/r2";

const ALLOWED_DIRS: UploadDirectory[] = ["cheques", "facturas", "remitos"];
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export async function POST(req: NextRequest) {
  try {
    const { filename, contentType, directory, entityName, date } = await req.json() as {
      filename: string;
      contentType: string;
      directory: UploadDirectory;
      entityName: string;
      date: string;
    };

    if (!ALLOWED_DIRS.includes(directory)) {
      return NextResponse.json({ error: "Directorio inválido" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 });
    }
    if (!entityName?.trim()) {
      return NextResponse.json({ error: "entityName es requerido" }, { status: 400 });
    }
    if (!date?.match(/^\d{4}-\d{2}/)) {
      return NextResponse.json({ error: "date debe tener formato YYYY-MM o YYYY-MM-DD" }, { status: 400 });
    }

    const key = buildR2Key({ directory, entityName, date, filename });

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 120 });

    // Return the key — not a public URL. The client stores the key and
    // requests a presigned GET URL via /api/file?key=... when needed.
    return NextResponse.json({ uploadUrl, key });
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json({ error: "Error generando URL de subida" }, { status: 500 });
  }
}

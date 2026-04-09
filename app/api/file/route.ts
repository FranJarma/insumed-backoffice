import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET } from "@/lib/r2";

// Presigned GET URLs expire after 1 hour
const EXPIRES_IN = 60 * 60;

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "key es requerido" }, { status: 400 });
  }

  // Basic path traversal guard
  if (key.includes("..") || key.startsWith("/")) {
    return NextResponse.json({ error: "key inválido" }, { status: 400 });
  }

  try {
    const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
    const url = await getSignedUrl(r2, command, { expiresIn: EXPIRES_IN });

    // Redirect directly to the presigned URL so <a href="/api/file?key=..."> works natively
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("[file]", err);
    return NextResponse.json({ error: "No se pudo generar el link de acceso" }, { status: 500 });
  }
}

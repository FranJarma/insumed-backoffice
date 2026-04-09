import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSession } from "@/lib/auth";
import { isValidR2Key } from "@/lib/file-security";
import { hasPermission } from "@/lib/permissions";
import { r2, R2_BUCKET } from "@/lib/r2";

const EXPIRES_IN = 60 * 60;

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
    return NextResponse.json({ error: "key inválido" }, { status: 400 });
  }

  try {
    const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
    const url = await getSignedUrl(r2, command, { expiresIn: EXPIRES_IN });
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("[file]", err);
    return NextResponse.json({ error: "No se pudo generar el link de acceso" }, { status: 500 });
  }
}

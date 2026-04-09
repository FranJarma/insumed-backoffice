import { S3Client } from "@aws-sdk/client-s3";

if (
  !process.env.R2_ACCOUNT_ID ||
  !process.env.R2_ACCESS_KEY_ID ||
  !process.env.R2_SECRET_ACCESS_KEY ||
  !process.env.R2_BUCKET_NAME
) {
  // Only warn — mock mode doesn't need R2
  if (process.env.USE_MOCK_DATA !== "true") {
    console.warn("[r2] Missing R2 environment variables");
  }
}

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? "";

export type UploadDirectory = "cheques" | "facturas" | "remitos";

/**
 * Builds the R2 object key with the structured path:
 *   {directory}/{entity-name}/{year}/{month}/{filename}
 *
 * e.g. facturas/distribuidora-medica-sa/2026/04/factura-fc-b-10023.pdf
 */
export function buildR2Key(opts: {
  directory: UploadDirectory;
  entityName: string;
  date: string; // "YYYY-MM-DD" or "YYYY-MM"
  filename: string;
}): string {
  const slug = slugify(opts.entityName);
  const [year, month] = opts.date.split("-");
  const ext = opts.filename.split(".").pop() ?? "bin";
  const baseName = slugify(opts.filename.replace(/\.[^.]+$/, ""));
  return `${opts.directory}/${slug}/${year}/${month}/${baseName}.${ext}`;
}

function slugify(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

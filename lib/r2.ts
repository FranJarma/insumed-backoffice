import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { requireEnv } from "@/lib/env";

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
  endpoint: `https://${requireEnv("R2_ACCOUNT_ID", { allowInMock: true })}.r2.cloudflarestorage.com`,
  requestChecksumCalculation: "WHEN_REQUIRED",
  credentials: {
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID", { allowInMock: true }),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY", { allowInMock: true }),
  },
});

export const R2_BUCKET = requireEnv("R2_BUCKET_NAME", { allowInMock: true });

export async function deleteR2Object(key: string) {
  await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}

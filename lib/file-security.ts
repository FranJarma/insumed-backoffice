import { randomUUID } from "crypto";

export const ALLOWED_UPLOAD_DIRS = ["cheques", "facturas", "remitos", "pagos"] as const;
export const ALLOWED_UPLOAD_TYPES = {
  "image/jpeg": { extension: "jpg", maxBytes: 2 * 1024 * 1024 },
  "image/png": { extension: "png", maxBytes: 2 * 1024 * 1024 },
  "image/webp": { extension: "webp", maxBytes: 2 * 1024 * 1024 },
  "application/pdf": { extension: "pdf", maxBytes: 2 * 1024 * 1024 },
} as const;

export type UploadDirectory = (typeof ALLOWED_UPLOAD_DIRS)[number];
export type AllowedUploadType = keyof typeof ALLOWED_UPLOAD_TYPES;

const R2_KEY_PATTERN =
  /^(cheques|facturas|remitos|pagos)\/\d{4}\/\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$/;

export function isAllowedUploadDirectory(value: string): value is UploadDirectory {
  return ALLOWED_UPLOAD_DIRS.includes(value as UploadDirectory);
}

export function isAllowedUploadType(value: string): value is AllowedUploadType {
  return value in ALLOWED_UPLOAD_TYPES;
}

export function getMaxUploadBytes(contentType: AllowedUploadType) {
  return ALLOWED_UPLOAD_TYPES[contentType].maxBytes;
}

export function buildRandomR2Key(opts: {
  directory: UploadDirectory;
  date: string;
  contentType: AllowedUploadType;
}) {
  const [year, month] = opts.date.split("-");
  const extension = ALLOWED_UPLOAD_TYPES[opts.contentType].extension;
  return `${opts.directory}/${year}/${month}/${randomUUID()}.${extension}`;
}

export function isValidR2Key(key: string) {
  return R2_KEY_PATTERN.test(key);
}

export function isValidR2KeyForDirectory(key: string, directory: UploadDirectory) {
  return isValidR2Key(key) && key.startsWith(`${directory}/`);
}

import { z } from "zod";
import { isValidR2KeyForDirectory, type UploadDirectory } from "@/lib/file-security";

export function optionalUploadKeySchema(directory: UploadDirectory, label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} inválido`)
    .refine((value) => isValidR2KeyForDirectory(value, directory), `${label} inválido`)
    .optional();
}

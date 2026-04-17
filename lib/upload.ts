import type { UploadDirectory } from "./file-security";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PDF_TYPE = "application/pdf";

const IMAGE_MAX_MB = 1;
const PDF_MAX_MB = 2;
const MAX_DIMENSION = 1920;

export interface UploadOptions {
  directory: UploadDirectory;
  date: string;
}

export function fileUrl(key: string): string {
  return `/api/file?key=${encodeURIComponent(key)}`;
}

export async function deleteUploadedFile(key: string) {
  const response = await fetch("/api/upload", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });

  if (!response.ok) {
    const { error } = await response.json().catch(() => ({ error: "Error desconocido" }));
    throw new Error(error ?? "No se pudo borrar el archivo");
  }
}

export async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas no disponible"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      const outputType = file.type === "image/webp" ? "image/webp" : "image/jpeg";
      const targetBytes = IMAGE_MAX_MB * 1024 * 1024;
      const qualities = [0.85, 0.7, 0.55, 0.4];

      const tryNext = (index: number) => {
        if (index >= qualities.length) {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("No se pudo comprimir la imagen"));
                return;
              }

              resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: outputType }));
            },
            outputType,
            qualities[qualities.length - 1]
          );
          return;
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("No se pudo comprimir la imagen"));
              return;
            }

            if (blob.size <= targetBytes) {
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: outputType }));
              return;
            }

            tryNext(index + 1);
          },
          outputType,
          qualities[index]
        );
      };

      tryNext(0);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo cargar la imagen"));
    };

    img.src = objectUrl;
  });
}

export function validateFile(file: File): string | null {
  if (![...IMAGE_TYPES, PDF_TYPE].includes(file.type)) {
    return "Tipo no permitido. Solo se aceptan imagenes (JPG, PNG, WebP) o PDF.";
  }
  if (file.type === PDF_TYPE && file.size > PDF_MAX_MB * 1024 * 1024) {
    return `El PDF no puede superar ${PDF_MAX_MB} MB.`;
  }
  if (IMAGE_TYPES.includes(file.type) && file.size > 10 * 1024 * 1024) {
    return "La imagen no puede superar 10 MB.";
  }

  return null;
}

export async function uploadFile(file: File, options: UploadOptions): Promise<string> {
  let fileToUpload = file;

  if (IMAGE_TYPES.includes(file.type)) {
    fileToUpload = await compressImage(file);
  }

  const response = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contentType: fileToUpload.type,
      directory: options.directory,
      date: options.date,
      size: fileToUpload.size,
    }),
  });

  if (!response.ok) {
    const { error } = await response.json().catch(() => ({ error: "Error desconocido" }));
    throw new Error(error ?? "No se pudo obtener la URL de subida");
  }

  const { uploadUrl, key } = (await response.json()) as { uploadUrl: string; key: string };

  const upload = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": fileToUpload.type },
    body: fileToUpload,
  });

  if (!upload.ok) {
    throw new Error("Error al subir el archivo a R2");
  }

  return key;
}

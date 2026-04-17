"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, ImagePlus, Loader2, Receipt, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { markSaleAsInvoiced } from "../actions";
import { deleteUploadedFile, fileUrl, uploadFile, validateFile } from "@/lib/upload";

const invoiceSaleSchema = z.object({
  invoiceNumber: z.string().min(1, "El número de factura es requerido"),
  invoiceDate: z.string().min(1, "La fecha de facturación es requerida"),
  documentUrl: z.string().optional(),
});

type InvoiceSaleInput = z.infer<typeof invoiceSaleSchema>;

interface InvoiceSaleDialogProps {
  saleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function InvoiceSaleDialog({
  saleId,
  open,
  onOpenChange,
  onSuccess,
}: InvoiceSaleDialogProps) {
  const [documentKey, setDocumentKey] = useState<string | undefined>();
  const [documentPreview, setDocumentPreview] = useState<string | undefined>();
  const [documentName, setDocumentName] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<InvoiceSaleInput>({
    resolver: zodResolver(invoiceSaleSchema),
    defaultValues: {
      invoiceDate: new Date().toISOString().split("T")[0],
    },
    mode: "onChange",
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploadError(null);
    setDocumentName(file.name);
    if (file.type.startsWith("image/")) {
      setDocumentPreview(URL.createObjectURL(file));
    }

    setIsUploading(true);
    try {
      const key = await uploadFile(file, {
        directory: "facturas",
        date: new Date().toISOString().slice(0, 10),
      });
      setDocumentKey(key);
      setValue("documentUrl", key);
    } catch {
      setUploadError("Error al subir el archivo. Intentá de nuevo.");
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = (shouldDelete = true) => {
    if (shouldDelete && documentKey) {
      void deleteUploadedFile(documentKey).catch(() => undefined);
    }
    if (documentPreview) URL.revokeObjectURL(documentPreview);
    setDocumentKey(undefined);
    setDocumentPreview(undefined);
    setDocumentName(undefined);
    setValue("documentUrl", undefined);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      clearFile();
      reset({ invoiceDate: new Date().toISOString().split("T")[0] });
      setUploadError(null);
    }
    onOpenChange(isOpen);
  };

  const onSubmit = async (data: InvoiceSaleInput) => {
    if (!saleId) return;
    const result = await markSaleAsInvoiced(saleId, {
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate,
      documentUrl: data.documentUrl,
    });
    if ("success" in result) {
      clearFile(false);
      reset({ invoiceDate: new Date().toISOString().split("T")[0] });
      onSuccess();
    }
  };

  const isPdf = documentName?.toLowerCase().endsWith(".pdf");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Registrar Factura
          </DialogTitle>
          <DialogDescription>
            Ingresá el número, la fecha de facturación y el comprobante para marcar la venta como facturada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invoiceNumber">
              N° de Factura <span className="text-destructive">*</span>
            </Label>
            <Input
              id="invoiceNumber"
              {...register("invoiceNumber")}
              placeholder="00001-00000001"
              autoFocus
            />
            {errors.invoiceNumber && (
              <p className="text-xs text-destructive">{errors.invoiceNumber.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invoiceDate">
              Fecha de Facturación <span className="text-destructive">*</span>
            </Label>
            <Input id="invoiceDate" type="date" {...register("invoiceDate")} />
            {errors.invoiceDate && (
              <p className="text-xs text-destructive">{errors.invoiceDate.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>
              Comprobante <span className="text-xs text-muted-foreground">(opcional - imagen o PDF)</span>
            </Label>

            {!documentKey && !isUploading && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <ImagePlus className="h-4 w-4" />
                Adjuntar PDF o imagen
              </button>
            )}

            {isUploading && (
              <div className="flex items-center gap-2 rounded-md border px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Subiendo archivo...
              </div>
            )}

            {documentKey && !isUploading && (
              <div className="relative rounded-md border bg-muted/30 p-2">
                <button
                  type="button"
                  onClick={() => clearFile()}
                  className="absolute right-1 top-1 rounded-full bg-background p-0.5 shadow transition-colors hover:bg-destructive hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {isPdf ? (
                  <a
                    href={fileUrl(documentKey)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-1 text-sm text-blue-600 hover:underline"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    {documentName}
                  </a>
                ) : documentPreview ? (
                  <img
                    src={documentPreview}
                    alt="Preview"
                    className="max-h-40 w-full rounded object-contain"
                  />
                ) : null}
              </div>
            )}

            {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || isUploading || !isValid}>
              {isSubmitting ? "Guardando..." : "Marcar como Facturada"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

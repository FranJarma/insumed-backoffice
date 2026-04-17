import { z } from "zod";
import type { Sale } from "@/db/schema";
import { optionalUploadKeySchema } from "@/lib/upload-validation";

export const createSaleSchema = z
  .object({
    clientId: z.string().min(1, "Seleccione un cliente valido"),
    invoiceType: z.enum(["A", "B"]).default("A"),
    invoiceNumber: z.string().optional(),
    invoiceDate: z.string().optional(),
    date: z.string().min(1, "La fecha es requerida"),
    oc: z.string().optional(),
    patient: z.string().optional(),
    amount: z
      .string()
      .min(1, "El monto es requerido")
      .refine((value) => !Number.isNaN(parseFloat(value)) && parseFloat(value) > 0, "El monto debe ser mayor a 0"),
    documentUrl: optionalUploadKeySchema("facturas", "Comprobante"),
    isInvoiced: z.boolean().default(false),
  })
  .refine((data) => !data.isInvoiced || !!data.invoiceNumber?.trim(), {
    message: "El numero de factura es requerido",
    path: ["invoiceNumber"],
  })
  .refine((data) => !data.isInvoiced || !!data.invoiceDate?.trim(), {
    message: "La fecha de facturacion es requerida",
    path: ["invoiceDate"],
  });

export const markSaleAsInvoicedSchema = z.object({
  invoiceNumber: z.string().trim().min(1, "El numero de factura es requerido"),
  invoiceDate: z.string().trim().min(1, "La fecha de facturacion es requerida"),
  documentUrl: optionalUploadKeySchema("facturas", "Comprobante"),
});

export const cancelSaleSchema = z.object({
  creditNoteNumber: z.string().min(1, "El numero de nota de credito es requerido"),
  cancellationDate: z.string().min(1, "La fecha de anulacion es requerida"),
  creditNoteUrl: optionalUploadKeySchema("facturas", "Nota de credito"),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type MarkSaleAsInvoicedInput = z.infer<typeof markSaleAsInvoicedSchema>;
export type CancelSaleInput = z.infer<typeof cancelSaleSchema>;

export type SaleWithClient = Sale & { clientName: string | null };

export type SaleItemInput = {
  supplyId: string;
  pm: string;
  supplyName: string;
  quantity: string;
  unitPrice: string;
  priceWithVat: string;
  subtotal: string;
};

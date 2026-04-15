import { z } from "zod";
import type { Sale } from "@/db/schema";

export const createSaleSchema = z.object({
  clientId: z.string().min(1, "Seleccione un cliente válido"),
  invoiceType: z.enum(["A", "B"]).default("A"),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  date: z.string().min(1, "La fecha es requerida"),
  oc: z.string().optional(),
  patient: z.string().optional(),
  amount: z
    .string()
    .min(1, "El monto es requerido")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, "El monto debe ser mayor a 0"),
  documentUrl: z.string().optional(),
  isInvoiced: z.boolean().default(false),
}).refine(
  (data) => !data.isInvoiced || (data.invoiceNumber && data.invoiceNumber.trim().length > 0),
  { message: "El número de factura es requerido", path: ["invoiceNumber"] }
).refine(
  (data) => !data.isInvoiced || (data.invoiceDate && data.invoiceDate.trim().length > 0),
  { message: "La fecha de facturación es requerida", path: ["invoiceDate"] }
);

export const cancelSaleSchema = z.object({
  creditNoteNumber: z.string().min(1, "El número de nota de crédito es requerido"),
  cancellationDate: z.string().min(1, "La fecha de anulación es requerida"),
  creditNoteUrl: z.string().optional(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
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

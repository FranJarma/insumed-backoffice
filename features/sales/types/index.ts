import { z } from "zod";
import type { Sale } from "@/db/schema";

export const createSaleSchema = z.object({
  clientId: z.string().min(1, "Seleccione un cliente válido"),
  invoiceType: z.enum(["A", "B"]).default("A"),
  invoiceNumber: z.string().min(1, "El número de factura es requerido"),
  date: z.string().min(1, "La fecha es requerida"),
  oc: z.string().optional(),
  patient: z.string().optional(),
  amount: z
    .string()
    .min(1, "El monto es requerido")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, "El monto debe ser mayor a 0"),
  documentUrl: z.string().optional(), // BASE64 foto de la factura
});

export const cancelSaleSchema = z.object({
  creditNoteNumber: z.string().min(1, "El número de nota de crédito es requerido"),
  creditNoteUrl: z
    .string()
    .min(1, "La URL de la nota de crédito es requerida")
    .url("URL de nota de crédito inválida"),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type CancelSaleInput = z.infer<typeof cancelSaleSchema>;

// Sale joined with client name
export type SaleWithClient = Sale & { clientName: string | null };

export type SaleItemInput = {
  supplyId: string;
  pm: string;
  supplyName: string;
  unitMeasure: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
};

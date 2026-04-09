import { z } from "zod";

export const PAYMENT_METHODS = [
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "EFECTIVO", label: "Efectivo" },
] as const;

export const createPurchaseSchema = z.object({
  provider: z.string().min(1, "El proveedor es requerido"),
  invoiceNumber: z.string().min(1, "El número de factura es requerido"),
  date: z.string().min(1, "La fecha es requerida"),
  amount: z
    .string()
    .min(1, "El monto es requerido")
    .refine(
      (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
      "El monto debe ser mayor a 0"
    ),
  paymentMethod: z.string().min(1, "El medio de pago es requerido"),
  remito: z.string().optional(),
  remitoUrl: z.string().optional(),
  category: z.enum(["PROVEEDOR", "VARIOS"]).default("PROVEEDOR"),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;

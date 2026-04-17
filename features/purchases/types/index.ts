import { z } from "zod";
import { optionalUploadKeySchema } from "@/lib/upload-validation";

export const PAYMENT_METHODS = [
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "EFECTIVO", label: "Efectivo" },
] as const;

export const createPurchaseSchema = z.object({
  provider: z.string().min(1, "El proveedor es requerido"),
  invoiceNumber: z.string().min(1, "El numero de factura es requerido"),
  date: z.string().min(1, "La fecha es requerida"),
  amount: z
    .string()
    .min(1, "El monto es requerido")
    .refine((value) => !Number.isNaN(parseFloat(value)) && parseFloat(value) > 0, "El monto debe ser mayor a 0"),
  paymentMethod: z.string().min(1, "El medio de pago es requerido"),
  remito: z.string().optional(),
  remitoUrl: optionalUploadKeySchema("remitos", "Remito"),
  category: z.enum(["PROVEEDOR", "VARIOS"]).default("PROVEEDOR"),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
